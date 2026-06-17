import { users, hashPassword, signToken, publicUser, send, requirePost } from '../_backend.js';

export default function handler(req, res) {
  if (!requirePost(req, res)) return;

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !email || !password) return send(res, 400, { error: 'Name, email and password are required.' });
  if (!email.includes('@')) return send(res, 400, { error: 'Please enter a valid email address.' });
  if (password.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters.' });

  if (users.some(u => u.email === email)) return send(res, 409, { error: 'This email is already registered. Please log in.' });

  const user = { id: String(Date.now()), name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  users.push(user);

  const token = signToken(publicUser(user));
  send(res, 200, { user: publicUser(user), token });
}
