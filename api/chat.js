import { send, requirePost, requireAuth, callGroq } from './_backend.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const groqRes = await callGroq({ ...(req.body || {}), stream: true });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch (e) { /* client disconnected */ }

    res.end();
  } catch (err) {
    const message = err.message || 'Chat request failed.';
    const status = message.includes('GROQ_API_KEY') ? 500 : 502;
    if (!res.headersSent) send(res, status, { error: message });
  }
}
