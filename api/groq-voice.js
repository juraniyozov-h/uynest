// Groq Whisper (ovoz → matn) proxy — kalitni serverda saqlaydi.
// Client audio blobni xom holda /api/groq-voice?ext=webm ga POST qiladi.
export const config = { api: { bodyParser: false } };

function groqKey() {
  return (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

const VOCAB =
  "Termiz, Toshkent, Samarqand, Buxoro, Namangan, Andijon, Farg'ona, Qarshi, Nukus, Urgench, Navoiy, Jizzax, Chirchiq, Yunusobod, Chilonzor, Olmazor, Mirobod, ijara, sotuv, kvartira, xonadon, xona, narx, dollar, arzon, qimmat";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = groqKey();
  if (!key) return res.status(500).json({ error: 'Groq kaliti sozlanmagan' });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks);
    if (buf.length < 2000) return res.status(400).send(''); // juda qisqa

    const ext = (req.query.ext || 'webm').toString().replace(/[^a-z0-9]/gi, '') || 'webm';
    const fd = new FormData();
    fd.append('file', new Blob([buf]), 'voice.' + ext);
    fd.append('model', 'whisper-large-v3');
    fd.append('language', 'uz');
    fd.append('response_format', 'text');
    fd.append('prompt', VOCAB);

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key },
      body: fd,
    });
    const text = await r.text();
    res.status(r.status);
    return res.send(text);
  } catch {
    return res.status(502).send('');
  }
}
