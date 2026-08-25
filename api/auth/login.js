import { users, verifyPassword, signToken, publicUser, send, requirePost, validateEmail, rateLimitCheck, recordAttempt, clearAttempts } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) return send(res, 400, { error: 'Please enter both email and password.' });
  if (!validateEmail(email)) return send(res, 400, { error: 'Please enter a valid email address.' });

  const rl = rateLimitCheck(`login:${email}`);
  if (rl.blocked) return send(res, 429, { error: `Too many failed attempts. Please try again in ${rl.remainingMinutes} minute(s).` });

  const user = users.find(u => u.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordAttempt(`login:${email}`);
    const remaining = 5 - (rateLimitCheck(`login:${email}`).attempts || 0);
    return send(res, 401, { error: remaining > 0 ? `Invalid email or password. ${remaining} attempt(s) remaining.` : 'Account temporarily locked. Please try again later.' });
  }

  clearAttempts(`login:${email}`);

  if (user.totpEnabled) {
    const tempToken = signToken({ ...publicUser(user), requiresTOTP: true, iat: Date.now() });
    return send(res, 200, { requiresTOTP: true, tempToken, user: publicUser(user) });
  }

  const token = signToken(publicUser(user));
  send(res, 200, { user: publicUser(user), token });
}
