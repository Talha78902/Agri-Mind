import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'agrimind_dev_secret_change_me';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const mailer = GMAIL_USER && GMAIL_APP_PASSWORD ? nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } }) : null;

async function sendEmail(to, subject, html) {
  if (!mailer) { console.log(`[EMAIL SKIPPED] No Gmail configured. To: ${to}, Subject: ${subject}`); return false; }
  try {
    await mailer.sendMail({ from: `"AgriMind" <${GMAIL_USER}>`, to, subject, html });
    console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL FAILED] To: ${to}, Error: ${err.message}`);
    return false;
  }
}

function otpEmailHtml(otp, purpose) {
  const title = purpose === 'signup' ? 'Verify Your Email' : 'Reset Your Password';
  const desc = purpose === 'signup' ? 'Use the code below to complete your AgriMind registration.' : 'Use the code below to reset your AgriMind password.';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif"><div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center"><div style="font-size:48px;margin-bottom:8px">🌾</div><h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">AgriMind</h1></div><div style="padding:32px 24px;text-align:center"><h2 style="color:#052e16;margin:0 0 8px;font-size:20px">${title}</h2><p style="color:#4a7c59;margin:0 0 24px;font-size:14px;line-height:1.6">${desc}</p><div style="background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:14px;padding:20px;margin:0 0 24px"><div style="font-size:36px;font-weight:900;letter-spacing:12px;color:#16a34a;font-family:'Courier New',monospace">${otp}</div></div><p style="color:#94a3b8;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, ignore this email.</p></div><div style="padding:16px 24px;background:#f0fdf4;text-align:center"><p style="color:#94a3b8;font-size:11px;margin:0">© ${new Date().getFullYear()} AgriMind — AI Agriculture Advisor</p></div></div></body></html>`;
}

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

const otpStore = new Map();
const resetStore = new Map();
const loginAttempts = new Map();

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
  return { id: user.id, name: user.name, email: user.email, totpEnabled: !!user.totpEnabled };
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload?.email) return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  req.user = payload;
  next();
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function generateSecret() {
  return crypto.randomBytes(20).toString('hex');
}

function generateTOTP(secret, timeStep = 30) {
  const epoch = Math.floor(Date.now() / 1000 / timeStep);
  const data = Buffer.alloc(8);
  data.writeBigInt64BE(BigInt(epoch));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(data).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1000000;
  return String(code).padStart(6, '0');
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, val] of otpStore) { if (now - val.createdAt > 600000) otpStore.delete(key); }
  for (const [key, val] of resetStore) { if (now - val.createdAt > 600000) resetStore.delete(key); }
}
setInterval(cleanupExpired, 120000);

function rateLimitCheck(key, maxAttempts = 5, windowMs = 900000) {
  const entry = loginAttempts.get(key);
  if (!entry) return { blocked: false, attempts: 0 };
  if (Date.now() - entry.windowStart > windowMs) { loginAttempts.delete(key); return { blocked: false, attempts: 0 }; }
  if (entry.attempts >= maxAttempts) {
    const remaining = Math.ceil((windowMs - (Date.now() - entry.windowStart)) / 60000);
    return { blocked: true, attempts: entry.attempts, remainingMinutes: remaining };
  }
  return { blocked: false, attempts: entry.attempts };
}

function recordAttempt(key) {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.windowStart > 900000) {
    loginAttempts.set(key, { attempts: 1, windowStart: Date.now() });
  } else {
    entry.attempts++;
  }
}

function clearAttempts(key) { loginAttempts.delete(key); }

function validatePasswordStrength(password) {
  const checks = { length: password.length >= 8, uppercase: /[A-Z]/.test(password), lowercase: /[a-z]/.test(password), number: /[0-9]/.test(password), special: /[^A-Za-z0-9]/.test(password) };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks, label: score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score <= 4 ? 'Strong' : 'Very Strong' };
}

function validateEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
}

async function callGroq({ model, system, messages, temperature = 0.7, max_tokens = 2048, stream = false }) {
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
      model: model || 'openai/gpt-oss-120b',
      messages: finalMessages,
      temperature,
      max_tokens,
      stream
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(async () => ({ error: { message: await response.text() } }));
    throw new Error(data?.error?.message || `Groq request failed (${response.status})`);
  }

  if (stream) return response;

  const data = await response.json();
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
  if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (name.length > 50) return res.status(400).json({ error: 'Name must be under 50 characters.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address (e.g. name@example.com).' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const strength = validatePasswordStrength(password);
  if (strength.score < 3) return res.status(400).json({ error: 'Password is too weak. Include uppercase, lowercase, numbers, and special characters.' });

  const users = readUsers();
  if (users.some(u => u.email === email)) return res.status(409).json({ error: 'This email is already registered. Please log in instead, or use "Forgot Password" to reset.' });

  const user = { id: String(Date.now()), name, email, passwordHash: hashPassword(password), totpSecret: null, totpEnabled: false, createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);

  const token = signToken(publicUser(user));
  res.json({ user: publicUser(user), token });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) return res.status(400).json({ error: 'Please enter both email and password.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const rl = rateLimitCheck(`login:${email}`);
  if (rl.blocked) return res.status(429).json({ error: `Too many failed attempts. Please try again in ${rl.remainingMinutes} minute(s).` });

  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordAttempt(`login:${email}`);
    const remaining = 5 - (rateLimitCheck(`login:${email}`).attempts || 0);
    return res.status(401).json({ error: remaining > 0 ? `Invalid email or password. ${remaining} attempt(s) remaining before lockout.` : 'Account temporarily locked due to too many failed attempts. Please try again later.' });
  }

  clearAttempts(`login:${email}`);

  if (user.totpEnabled) {
    const tempToken = signToken({ ...publicUser(user), requiresTOTP: true, iat: Date.now() });
    return res.json({ requiresTOTP: true, tempToken, user: publicUser(user) });
  }

  const token = signToken(publicUser(user));
  res.json({ user: publicUser(user), token });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const purpose = req.body.purpose || 'signup';

  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'OTP must be a 6-digit code.' });

  const key = `${purpose}:${email}`;
  const entry = otpStore.get(key);

  if (!entry) return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
  if (Date.now() - entry.createdAt > 600000) { otpStore.delete(key); return res.status(400).json({ error: 'OTP expired. Please request a new code.' }); }
  if (entry.attempts >= 5) { otpStore.delete(key); return res.status(429).json({ error: 'Too many OTP attempts. Please request a new code.' }); }
  if (entry.code !== otp) { entry.attempts++; return res.status(400).json({ error: `Invalid OTP. ${5 - entry.attempts} attempt(s) remaining.` }); }

  otpStore.delete(key);

  if (purpose === 'signup') {
    const users = readUsers();
    if (users.some(u => u.email === email)) return res.status(409).json({ error: 'This email is already registered.' });
    const user = { id: String(Date.now()), name: entry.data.name, email, passwordHash: entry.data.passwordHash, totpSecret: null, totpEnabled: false, createdAt: new Date().toISOString() };
    users.push(user);
    writeUsers(users);
    const token = signToken(publicUser(user));
    return res.json({ verified: true, user: publicUser(user), token });
  }

  if (purpose === 'reset') {
    const resetToken = signToken({ email, purpose: 'reset', iat: Date.now() });
    return res.json({ verified: true, resetToken });
  }

  res.status(400).json({ error: 'Unknown OTP purpose.' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const users = readUsers();
  const user = users.find(u => u.email === email);

  const key = `reset:${email}`;
  if (otpStore.has(key)) { otpStore.delete(key); }

  if (user) {
    const otp = generateOTP();
    otpStore.set(key, { code: otp, createdAt: Date.now(), attempts: 0 });
    console.log(`[RESET OTP] ${email}: ${otp}`);
    await sendEmail(email, 'AgriMind — Reset Your Password', otpEmailHtml(otp, 'reset'));
    return res.json({ message: 'If this email exists, a reset code has been sent.' });
  }

  res.json({ message: 'If this email exists, a 6-digit reset code has been sent.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const newPassword = String(req.body.password || '');
  const resetToken = req.body.resetToken;

  if (!email || !newPassword || !resetToken) return res.status(400).json({ error: 'Email, new password, and reset token are required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  const strength = validatePasswordStrength(newPassword);
  if (strength.score < 3) return res.status(400).json({ error: 'Password is too weak. Include uppercase, lowercase, numbers, and special characters.' });

  const payload = verifyToken(resetToken);
  if (!payload || payload.email !== email || payload.purpose !== 'reset') {
    return res.status(400).json({ error: 'Invalid or expired reset token. Please start the reset process again.' });
  }

  const tokenAge = Date.now() - (payload.iat || 0);
  if (tokenAge > 600000) return res.status(400).json({ error: 'Reset token expired. Please request a new code.' });

  const users = readUsers();
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return res.status(404).json({ error: 'Account not found.' });

  users[idx].passwordHash = hashPassword(newPassword);
  writeUsers(users);

  const token = signToken(publicUser(users[idx]));
  res.json({ message: 'Password reset successful.', user: publicUser(users[idx]), token });
});

app.post('/api/auth/send-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const purpose = req.body.purpose || 'signup';
  const name = String(req.body.name || '').trim();
  const password = String(req.body.password || '');

  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  if (purpose === 'signup') {
    const users = readUsers();
    if (users.some(u => u.email === email)) return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required for signup verification.' });

    const rl = rateLimitCheck(`otp:${email}`, 5, 300000);
    if (rl.blocked) return res.status(429).json({ error: `Too many OTP requests. Please wait ${rl.remainingMinutes} minute(s).` });

    const otp = generateOTP();
    otpStore.set(`signup:${email}`, { code: otp, createdAt: Date.now(), attempts: 0, data: { name, passwordHash: hashPassword(password) } });
    console.log(`[SIGNUP OTP] ${email}: ${otp}`);
    const sent = await sendEmail(email, 'AgriMind — Verify Your Email', otpEmailHtml(otp, 'signup'));
    return res.json({ message: sent ? 'A verification code has been sent to your email.' : 'Failed to send email. Please try again.', otp: sent ? undefined : otp });
  }

  if (purpose === 'reset') {
    const rl = rateLimitCheck(`otp-reset:${email}`, 3, 300000);
    if (rl.blocked) return res.status(429).json({ error: `Too many requests. Please wait ${rl.remainingMinutes} minute(s).` });

    const otp = generateOTP();
    otpStore.set(`reset:${email}`, { code: otp, createdAt: Date.now(), attempts: 0 });
    console.log(`[RESET OTP] ${email}: ${otp}`);
    const sent = await sendEmail(email, 'AgriMind — Reset Your Password', otpEmailHtml(otp, 'reset'));
    return res.json({ message: sent ? 'A reset code has been sent to your email.' : 'Failed to send email. Please try again.', otp: sent ? undefined : otp });
  }

  res.status(400).json({ error: 'Unknown purpose.' });
});

app.post('/api/auth/verify-totp', (req, res) => {
  const token = req.body.tempToken;
  const code = String(req.body.code || '').trim();

  if (!token || !code) return res.status(400).json({ error: 'Token and TOTP code are required.' });

  const payload = verifyToken(token);
  if (!payload?.requiresTOTP) return res.status(400).json({ error: 'Invalid session. Please log in again.' });

  const users = readUsers();
  const user = users.find(u => u.email === payload.email);
  if (!user || !user.totpEnabled || !user.totpSecret) return res.status(400).json({ error: '2FA is not enabled for this account.' });

  const expected = generateTOTP(user.totpSecret);
  if (code !== expected) return res.status(400).json({ error: 'Invalid 2FA code. Please check your authenticator app.' });

  const authToken = signToken(publicUser(user));
  res.json({ user: publicUser(user), token: authToken });
});

app.post('/api/auth/setup-2fa', requireAuth, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled.' });

  const secret = generateSecret();
  user.totpSecret = secret;
  writeUsers(users);

  const otpauth = `otpauth://totp/AgriMind:${user.email}?secret=${secret}&issuer=AgriMind&algorithm=SHA1&digits=6&period=30`;
  res.json({ secret, otpauth });
});

app.post('/api/auth/enable-2fa', requireAuth, (req, res) => {
  const code = String(req.body.code || '').trim();
  const users = readUsers();
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled.' });
  if (!user.totpSecret) return res.status(400).json({ error: 'Please set up 2FA first.' });

  const expected = generateTOTP(user.totpSecret);
  if (code !== expected) return res.status(400).json({ error: 'Invalid code. Make sure your authenticator app time is synced correctly.' });

  user.totpEnabled = true;
  writeUsers(users);

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
  user.backupCodes = backupCodes;
  writeUsers(users);

  res.json({ message: '2FA enabled successfully.', backupCodes });
});

app.post('/api/auth/disable-2fa', requireAuth, (req, res) => {
  const password = String(req.body.password || '');
  const users = readUsers();
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!user.totpEnabled) return res.status(400).json({ error: '2FA is not enabled.' });
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid password.' });

  user.totpEnabled = false;
  user.totpSecret = null;
  user.backupCodes = null;
  writeUsers(users);

  res.json({ message: '2FA has been disabled.' });
});

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const groqRes = await callGroq({ ...(req.body || {}), stream: true });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch (e) { /* client disconnected */ }

    res.end();
  } catch (err) {
    const message = err.message || 'Chat request failed.';
    const status = message.includes('GROQ_API_KEY') ? 500 : 502;
    if (!res.headersSent) res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`AgriMind backend running on http://localhost:${PORT}`);
  console.log(`Groq key loaded: ${GROQ_API_KEY ? 'yes' : 'no - add GROQ_API_KEY in .env'}`);
});
