import { users, validateEmail, rateLimitCheck, generateOTP, signOtpToken, sendEmail, otpEmailHtml, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return send(res, 400, { error: 'Email is required.' });
  if (!validateEmail(email)) return send(res, 400, { error: 'Please enter a valid email address.' });

  const user = users.find(u => u.email === email);

  if (user) {
    const otp = generateOTP();
    const otpToken = signOtpToken(email, otp, 'reset');
    console.log(`[RESET OTP] ${email}: ${otp}`);
    await sendEmail(email, 'AgriMind — Reset Your Password', otpEmailHtml(otp, 'reset'));
    return send(res, 200, { message: 'If this email exists, a reset code has been sent.', otpToken });
  }

  send(res, 200, { message: 'If this email exists, a reset code has been sent.' });
}
