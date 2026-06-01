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

    // Use default bucket (configured via storageBucket in initializeApp)
    const bucket = admin.storage().bucket();
    const ext = (filename.split('.').pop() || 'bin').toLowerCase();
    const destPath = `chat_media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const file = bucket.file(destPath);

    await file.save(buffer, {
      contentType: mimeType || 'application/octet-stream',
      metadata: { cacheControl: 'public,max-age=31536000' },
    });

    // Make the file publicly readable
    await file.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
    console.log('Uploaded media:', destPath, 'size:', buffer.length, 'url:', url);
    res.json({ ok: true, url });
  } catch (err) {
    console.error('Media upload error:', err.message, err.stack);
    res.status(500).json({ error: err.message || String(err) });
  }
}
