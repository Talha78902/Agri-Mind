import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'agrimind_vercel_secret_change_me';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!globalThis.__AGRIMIND_USERS__) globalThis.__AGRIMIND_USERS__ = [];
const users = globalThis.__AGRIMIND_USERS__;

if (!globalThis.__AGRIMIND_OTP__) globalThis.__AGRIMIND_OTP__ = new Map();
const otpStore = globalThis.__AGRIMIND_OTP__;

if (!globalThis.__AGRIMIND_RATE__) globalThis.__AGRIMIND_RATE__ = new Map();
const loginAttempts = globalThis.__AGRIMIND_RATE__;

const mailer = GMAIL_USER && GMAIL_APP_PASSWORD ? nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } }) : null;

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

function send(res, status, body) {
  res.status(status).json(body);
}

function requirePost(req, res) {
  if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed' }); return false; }
  return true;
}

function requireAuth(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload?.email) { send(res, 401, { error: 'Unauthorized. Please log in again.' }); return null; }
  return payload;
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

function validateEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
}

function validatePasswordStrength(password) {
  const checks = { length: password.length >= 8, uppercase: /[A-Z]/.test(password), lowercase: /[a-z]/.test(password), number: /[0-9]/.test(password), special: /[^A-Za-z0-9]/.test(password) };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks, label: score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score <= 4 ? 'Strong' : 'Very Strong' };
}

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
  if (!entry || Date.now() - entry.windowStart > 900000) { loginAttempts.set(key, { attempts: 1, windowStart: Date.now() }); }
  else { entry.attempts++; }
}

function clearAttempts(key) { loginAttempts.delete(key); }

async function sendEmail(to, subject, html) {
  if (!mailer) { console.log(`[EMAIL SKIPPED] No Gmail configured. To: ${to}`); return false; }
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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif"><div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center"><div style="font-size:48px;margin-bottom:8px">🌾</div><h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">AgriMind</h1></div><div style="padding:32px 24px;text-align:center"><h2 style="color:#052e16;margin:0 0 8px;font-size:20px">${title}</h2><p style="color:#4a7c59;margin:0 0 24px;font-size:14px;line-height:1.6">${desc}</p><div style="background:#f0fdf4;border:2px dashed #bbf7d0;border-radius:14px;padding:20px;margin:0 0 24px"><div style="font-size:36px;font-weight:900;letter-spacing:12px;color:#16a34a;font-family:'Courier New',monospace">${otp}</div></div><p style="color:#94a3b8;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, ignore this email.</p></div><div style="padding:16px 24px;background:#f0fdf4;text-align:center"><p style="color:#94a3b8;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} AgriMind &mdash; AI Agriculture Advisor</p></div></div></body></html>`;
}

async function callGroq({ model, system, messages, temperature = 0.7, max_tokens = 2048, stream = false }) {
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

export { users, hashPassword, verifyPassword, signToken, verifyToken, publicUser, send, requirePost, requireAuth, callGroq, generateOTP, generateSecret, generateTOTP, validateEmail, validatePasswordStrength, rateLimitCheck, recordAttempt, clearAttempts, otpStore, sendEmail, otpEmailHtml };
