import { users, verifyPassword, requireAuth, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const password = String(req.body.password || '');
  const u = users.find(u => u.email === user.email);
  if (!u) return send(res, 404, { error: 'User not found.' });
  if (!u.totpEnabled) return send(res, 400, { error: '2FA is not enabled.' });
  if (!verifyPassword(password, u.passwordHash)) return send(res, 401, { error: 'Invalid password.' });

  u.totpEnabled = false;
  u.totpSecret = null;
  u.backupCodes = null;

  send(res, 200, { message: '2FA has been disabled.' });
}
