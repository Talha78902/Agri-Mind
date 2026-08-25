import { users, hashPassword, signToken, publicUser, send, requirePost, validateEmail, validatePasswordStrength, otpStore, generateOTP, sendEmail, otpEmailHtml } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) return send(res, 400, { error: 'Name, email and password are required.' });
  if (name.length < 2) return send(res, 400, { error: 'Name must be at least 2 characters.' });
  if (!validateEmail(email)) return send(res, 400, { error: 'Please enter a valid email address.' });
  if (password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters.' });
  const strength = validatePasswordStrength(password);
  if (strength.score < 3) return send(res, 400, { error: 'Password is too weak. Include uppercase, lowercase, numbers, and special characters.' });

  if (users.some(u => u.email === email)) return send(res, 409, { error: 'This email is already registered. Please log in instead.' });

  const user = { id: String(Date.now()), name, email, passwordHash: hashPassword(password), totpSecret: null, totpEnabled: false, createdAt: new Date().toISOString() };
  users.push(user);

  const token = signToken(publicUser(user));
  send(res, 200, { user: publicUser(user), token });
}
