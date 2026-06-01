import { admin } from '../lib/firebase.js';
import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = new IncomingForm({ maxFileSize: 52_428_800 }); // 50MB
    const [, files] = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve([fields, files]))
    );

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const bucket = admin.storage().bucket(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
    const ext = file.originalFilename?.split('.').pop() || 'bin';
    const destPath = `chat_media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const destFile = bucket.file(destPath);

    const buffer = readFileSync(file.filepath);
    await destFile.save(buffer, { contentType: file.mimetype || 'application/octet-stream' });
    await destFile.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${destPath}`;

    res.json({ ok: true, url });
  } catch (err) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: String(err) });
  }
}
