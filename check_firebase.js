import admin from 'firebase-admin';
import fs from 'fs';

// Manually parse .env file supporting multiline quotes
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
const lines = envFile.split('\n');
let currentKey = null;
let currentValue = [];

lines.forEach(line => {
  if (currentKey) {
    if (line.includes('"') && (line.trim().endsWith('"') || line.trim().endsWith('"\r'))) {
      let cleanLine = line.trim();
      if (cleanLine.endsWith('\r')) cleanLine = cleanLine.slice(0, -1);
      currentValue.push(cleanLine.slice(0, -1));
      env[currentKey] = currentValue.join('\n').replace(/\\n/g, '\n');
      currentKey = null;
      currentValue = [];
    } else {
      let cleanLine = line;
      if (cleanLine.endsWith('\r')) cleanLine = cleanLine.slice(0, -1);
      currentValue.push(cleanLine);
    }
  } else {
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (val.endsWith('\r')) val = val.slice(0, -1);
      
      if (val.startsWith('"') && !val.endsWith('"')) {
        currentKey = key;
        currentValue = [val.slice(1)];
      } else {
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        env[key] = val.replace(/\\n/g, '\n');
      }
    }
  }
});

const privateKey = env.FIREBASE_PRIVATE_KEY;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = admin.firestore();

async function check() {
  console.log('Querying for code 876139...');
  const snap = await db.collection('telegram_codes')
    .where('code', '==', '876139')
    .get();

  if (snap.empty) {
    console.log('No document found with code 876139.');
    return;
  }

  snap.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

check().catch(console.error);
