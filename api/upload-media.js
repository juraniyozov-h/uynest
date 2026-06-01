import { admin } from '../lib/firebase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, filename, mimeType } = req.body || {};
    if (!data || !filename) return res.status(400).json({ error: 'data and filename required' });

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 52_428_800) return res.status(413).json({ error: 'File too large (max 50MB)' });

    const bucket = admin.storage().bucket(
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
    );
    const ext = filename.split('.').pop() || 'bin';
    const destPath = `chat_media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const file = bucket.file(destPath);

    await file.save(buffer, { contentType: mimeType || 'application/octet-stream', public: true });
    const url = `https://storage.googleapis.com/${bucket.name}/${destPath}`;

    res.json({ ok: true, url });
  } catch (err) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: String(err) });
  }
}
