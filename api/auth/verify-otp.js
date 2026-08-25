import { users, signToken, publicUser, otpStore, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const purpose = req.body.purpose || 'signup';

  if (!email || !otp) return send(res, 400, { error: 'Email and OTP are required.' });
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) return send(res, 400, { error: 'OTP must be a 6-digit code.' });

  const key = `${purpose}:${email}`;
  const entry = otpStore.get(key);

  if (!entry) return send(res, 400, { error: 'No OTP found. Please request a new code.' });
  if (Date.now() - entry.createdAt > 600000) { otpStore.delete(key); return send(res, 400, { error: 'OTP expired. Please request a new code.' }); }
  if (entry.attempts >= 5) { otpStore.delete(key); return send(res, 429, { error: 'Too many OTP attempts. Please request a new code.' }); }
  if (entry.code !== otp) { entry.attempts++; return send(res, 400, { error: `Invalid OTP. ${5 - entry.attempts} attempt(s) remaining.` }); }

  otpStore.delete(key);

  if (purpose === 'signup') {
    if (users.some(u => u.email === email)) return send(res, 409, { error: 'This email is already registered.' });
    const user = { id: String(Date.now()), name: entry.data.name, email, passwordHash: entry.data.passwordHash, totpSecret: null, totpEnabled: false, createdAt: new Date().toISOString() };
    users.push(user);
    const token = signToken(publicUser(user));
    return send(res, 200, { verified: true, user: publicUser(user), token });
  }

  if (purpose === 'reset') {
    const resetToken = signToken({ email, purpose: 'reset', iat: Date.now() });
    return send(res, 200, { verified: true, resetToken });
  }

  send(res, 400, { error: 'Unknown OTP purpose.' });
}
