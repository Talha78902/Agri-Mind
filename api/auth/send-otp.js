import { users, hashPassword, validateEmail, rateLimitCheck, otpStore, generateOTP, sendEmail, otpEmailHtml, send, requirePost } from '../_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const email = String(req.body.email || '').trim().toLowerCase();
  const purpose = req.body.purpose || 'signup';
  const name = String(req.body.name || '').trim();
  const password = String(req.body.password || '');

  if (!email) return send(res, 400, { error: 'Email is required.' });
  if (!validateEmail(email)) return send(res, 400, { error: 'Please enter a valid email address.' });

  if (purpose === 'signup') {
    if (users.some(u => u.email === email)) return send(res, 409, { error: 'This email is already registered. Please log in instead.' });
    if (!name || !password) return send(res, 400, { error: 'Name and password are required.' });

    const rl = rateLimitCheck(`otp:${email}`, 5, 300000);
    if (rl.blocked) return send(res, 429, { error: `Too many OTP requests. Please wait ${rl.remainingMinutes} minute(s).` });

    const otp = generateOTP();
    otpStore.set(`signup:${email}`, { code: otp, createdAt: Date.now(), attempts: 0, data: { name, passwordHash: hashPassword(password) } });
    console.log(`[SIGNUP OTP] ${email}: ${otp}`);
    const sent = await sendEmail(email, 'AgriMind — Verify Your Email', otpEmailHtml(otp, 'signup'));
    return send(res, 200, { message: sent ? 'A verification code has been sent to your email.' : 'Failed to send email. Please try again.' });
  }

  if (purpose === 'reset') {
    const rl = rateLimitCheck(`otp-reset:${email}`, 3, 300000);
    if (rl.blocked) return send(res, 429, { error: `Too many requests. Please wait ${rl.remainingMinutes} minute(s).` });

    const otp = generateOTP();
    otpStore.set(`reset:${email}`, { code: otp, createdAt: Date.now(), attempts: 0 });
    console.log(`[RESET OTP] ${email}: ${otp}`);
    const sent = await sendEmail(email, 'AgriMind — Reset Your Password', otpEmailHtml(otp, 'reset'));
    return send(res, 200, { message: sent ? 'A reset code has been sent to your email.' : 'Failed to send email. Please try again.' });
  }

  send(res, 400, { error: 'Unknown purpose.' });
}
