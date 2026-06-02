import crypto from 'crypto';
import https from 'https';

// Generate a service account JWT and exchange it for an access token
async function getAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Firebase credentials not configured');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sig = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(privateKey, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        const j = JSON.parse(d);
        if (j.access_token) resolve(j.access_token);
        else reject(new Error('Token error: ' + d.slice(0, 200)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Upload buffer to Firebase Storage via REST API
async function uploadToStorage(token, bucket, destPath, buffer, mimeType) {
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(destPath)}`;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(uploadUrl);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
        'Content-Length': buffer.length,
      },
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        const j = JSON.parse(d);
        if (r.statusCode === 200) resolve(j);
        else reject(new Error(`Storage upload failed ${r.statusCode}: ${d.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// Make file public
async function makePublic(token, bucket, destPath) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ role: 'READER', entity: 'allUsers' });
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(destPath)}/acl`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (r) => { r.resume(); r.on('end', resolve); });
    req.on('error', () => resolve()); // non-fatal
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, filename, mimeType } = req.body || {};
    if (!data || !filename) return res.status(400).json({ error: 'data and filename required' });

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 52_428_800) return res.status(413).json({ error: 'File too large (max 50MB)' });

    const bucket = process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`;

    const ext = (filename.split('.').pop() || 'bin').toLowerCase();
    const destPath = `chat_media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const fileMime = mimeType || (ext === 'mp4' || ext === 'mov' || ext === 'webm' ? 'video/mp4' : 'image/jpeg');

    const token = await getAccessToken();
    await uploadToStorage(token, bucket, destPath, buffer, fileMime);
    await makePublic(token, bucket, destPath);

    const url = `https://storage.googleapis.com/${bucket}/${destPath}`;
    console.log('Uploaded:', destPath, 'size:', buffer.length);
    res.json({ ok: true, url });
  } catch (err) {
    console.error('upload-media error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
