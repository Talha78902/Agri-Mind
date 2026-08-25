export default function handler(req, res) {
  res.status(200).json({ ok: true, backend: 'vercel', groqKeyLoaded: Boolean(process.env.GROQ_API_KEY) });
}
