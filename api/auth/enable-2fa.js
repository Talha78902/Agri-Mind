import { users, generateTOTP, requireAuth, send, requirePost } from '../_backend.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  const code = String(req.body.code || '').trim();
  const u = users.find(u => u.email === user.email);
  if (!u) return send(res, 404, { error: 'User not found.' });
  if (u.totpEnabled) return send(res, 400, { error: '2FA is already enabled.' });
  if (!u.totpSecret) return send(res, 400, { error: 'Please set up 2FA first.' });

  const expected = generateTOTP(u.totpSecret);
  if (code !== expected) return send(res, 400, { error: 'Invalid code.' });

  u.totpEnabled = true;
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
  u.backupCodes = backupCodes;

  send(res, 200, { message: '2FA enabled.', backupCodes });
}
