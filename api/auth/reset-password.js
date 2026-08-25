import { users, hashPassword, verifyToken, publicUser, signToken, validatePasswordStrength, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const email = String(req.body.email || '').trim().toLowerCase();
  const newPassword = String(req.body.password || '');
  const resetToken = req.body.resetToken;

  if (!email || !newPassword || !resetToken) return send(res, 400, { error: 'Email, new password, and reset token are required.' });
  if (newPassword.length < 8) return send(res, 400, { error: 'New password must be at least 8 characters.' });
  const strength = validatePasswordStrength(newPassword);
  if (strength.score < 3) return send(res, 400, { error: 'Password is too weak.' });

  const payload = verifyToken(resetToken);
  if (!payload || payload.email !== email || payload.purpose !== 'reset') {
    return send(res, 400, { error: 'Invalid or expired reset token.' });
  }

  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return send(res, 404, { error: 'Account not found.' });

  users[idx].passwordHash = hashPassword(newPassword);
  const token = signToken(publicUser(users[idx]));
  send(res, 200, { message: 'Password reset successful.', user: publicUser(users[idx]), token });
}
