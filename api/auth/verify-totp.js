import { users, verifyToken, generateTOTP, signToken, publicUser, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const token = req.body.tempToken;
  const code = String(req.body.code || '').trim();

  if (!token || !code) return send(res, 400, { error: 'Token and TOTP code are required.' });

  const payload = verifyToken(token);
  if (!payload?.requiresTOTP) return send(res, 400, { error: 'Invalid session. Please log in again.' });

  const user = users.find(u => u.email === payload.email);
  if (!user || !user.totpEnabled || !user.totpSecret) return send(res, 400, { error: '2FA is not enabled.' });

  const expected = generateTOTP(user.totpSecret);
  if (code !== expected) return send(res, 400, { error: 'Invalid 2FA code.' });

  const authToken = signToken(publicUser(user));
  send(res, 200, { user: publicUser(user), token: authToken });
}
