import { users, signToken, publicUser, verifyOtpToken, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const otp = String(req.body.otp || '').trim();
  const otpToken = req.body.otpToken;
  const purpose = req.body.purpose || 'signup';

  if (!otp || !otpToken) return send(res, 400, { error: 'OTP and verification token are required.' });
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) return send(res, 400, { error: 'OTP must be a 6-digit code.' });

  const payload = verifyOtpToken(otpToken, otp);
  if (!payload) return send(res, 400, { error: 'Invalid or expired OTP. Please request a new code.' });
  if (payload.purpose !== purpose) return send(res, 400, { error: 'Invalid verification purpose.' });

  if (purpose === 'signup') {
    if (users.some(u => u.email === payload.email)) return send(res, 409, { error: 'This email is already registered.' });
    const user = { id: String(Date.now()), name: payload.name, email: payload.email, passwordHash: payload.passwordHash, totpSecret: null, totpEnabled: false, createdAt: new Date().toISOString() };
    users.push(user);
    const token = signToken(publicUser(user));
    return send(res, 200, { verified: true, user: publicUser(user), token });
  }

  if (purpose === 'reset') {
    const resetToken = signToken({ email: payload.email, purpose: 'reset', iat: Date.now() });
    return send(res, 200, { verified: true, resetToken });
  }

  send(res, 400, { error: 'Unknown purpose.' });
}
