import { send, requirePost, requireAuth, callGroq } from './_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const reply = await callGroq(req.body || {});
    send(res, 200, { reply });
  } catch (err) {
    const message = err.message || 'Chat request failed.';
    const status = message.includes('GROQ_API_KEY') ? 500 : 502;
    send(res, status, { error: message });
  }
}
