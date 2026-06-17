import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'agrimind_dev_secret_change_me';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]'); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
  catch { return null; }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload?.email) return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  req.user = payload;
  next();
}

async function callGroq({ model, system, messages, temperature = 0.7, max_tokens = 2048 }) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Add it to .env locally and Vercel Environment Variables for deployment.');
  }

  const finalMessages = [
    { role: 'system', content: system || 'You are AgriMind, a helpful agriculture assistant.' },
    ...(Array.isArray(messages) ? messages : [])
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages: finalMessages,
      temperature,
      max_tokens,
      stream: false
    })
  });

  const data = await response.json().catch(async () => ({ error: { message: await response.text() } }));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed (${response.status})`);
  }

  return data?.choices?.[0]?.message?.content || 'No response received from model.';
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, backend: 'running', groqKeyLoaded: Boolean(GROQ_API_KEY) });
});

app.post('/api/auth/signup', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!email.includes('@')) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const users = readUsers();
  if (users.some(u => u.email === email)) return res.status(409).json({ error: 'This email is already registered. Please log in.' });

  const user = { id: String(Date.now()), name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);

  const token = signToken(publicUser(user));
  res.json({ user: publicUser(user), token });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = readUsers().find(u => u.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password. Create an account first if you are new.' });
  }

  const token = signToken(publicUser(user));
  res.json({ user: publicUser(user), token });
});

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const reply = await callGroq(req.body || {});
    res.json({ reply });
  } catch (err) {
    const message = err.message || 'Chat request failed.';
    const status = message.includes('GROQ_API_KEY') ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`AgriMind backend running on http://localhost:${PORT}`);
  console.log(`Groq key loaded: ${GROQ_API_KEY ? 'yes' : 'no - add GROQ_API_KEY in .env'}`);
});
