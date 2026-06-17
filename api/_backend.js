import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'agrimind_vercel_secret_change_me';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!globalThis.__AGRIMIND_USERS__) globalThis.__AGRIMIND_USERS__ = [];
const users = globalThis.__AGRIMIND_USERS__;

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

function send(res, status, body) {
  res.status(status).json(body);
}

function requirePost(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return false;
  }
  return true;
}

function requireAuth(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload?.email) {
    send(res, 401, { error: 'Unauthorized. Please log in again.' });
    return null;
  }
  return payload;
}

async function callGroq({ model, system, messages, temperature = 0.7, max_tokens = 2048 }) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Add it in Vercel Environment Variables.');
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

export { users, hashPassword, verifyPassword, signToken, publicUser, send, requirePost, requireAuth, callGroq };
