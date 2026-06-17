import { users, verifyPassword, signToken, publicUser, send, requirePost } from '../_backend.js';

export default function handler(req, res) {
  if (!requirePost(req, res)) return;

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = users.find(u => u.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return send(res, 401, { error: 'Invalid email or password. Create an account first if you are new.' });
  }

  const token = signToken(publicUser(user));
  send(res, 200, { user: publicUser(user), token });
}
