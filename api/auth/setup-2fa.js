import { users, generateSecret, requireAuth, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const u = users.find(u => u.email === user.email);
  if (!u) return send(res, 404, { error: 'User not found.' });
  if (u.totpEnabled) return send(res, 400, { error: '2FA is already enabled.' });

  const secret = generateSecret();
  u.totpSecret = secret;

  const otpauth = `otpauth://totp/AgriMind:${u.email}?secret=${secret}&issuer=AgriMind&algorithm=SHA1&digits=6&period=30`;
  send(res, 200, { secret, otpauth });
}
