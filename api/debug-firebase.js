export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const pk = process.env.FIREBASE_PRIVATE_KEY || '';

  return res.json({
    projectId: process.env.FIREBASE_PROJECT_ID ? '✓' : '✗',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? '✓' : '✗',
    privateKeyLength: pk.length,
    privateKeyStart: pk.slice(0, 80),
    privateKeyEnd: pk.slice(-80),
    hasBeginMarker: pk.includes('BEGIN'),
    hasEndMarker: pk.includes('END'),
    hasNewlines: pk.includes('\n'),
    hasEscapedNewlines: pk.includes('\\n'),
  });
}
