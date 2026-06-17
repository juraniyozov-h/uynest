// Groq chat proxy — kalitni serverda saqlaydi (client bundle'iga chiqmaydi).
// Client /api/groq-chat ga {messages, temperature, max_tokens} yuboradi.
function groqKey() {
  return (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = groqKey();
  if (!key) return res.status(500).json({ error: 'Groq kaliti sozlanmagan' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Modelni serverda majburlaymiz — proxy'dan suiiste'molni kamaytiradi
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: Array.isArray(body.messages) ? body.messages : [],
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.4,
      max_tokens: Math.min(body.max_tokens || 600, 1500),
    };
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'Groq proxy xatosi' });
  }
}
