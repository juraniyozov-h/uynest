import admin from 'firebase-admin';

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  console.log('[Firebase] Raw key length:', privateKey.length);
  console.log('[Firebase] Raw key start:', privateKey.slice(0, 50));

  // Remove surrounding quotes (both single and double)
  privateKey = privateKey.replace(/^["']/, '').replace(/["']$/, '');

  // Handle escaped newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  console.log('[Firebase] After processing:', privateKey.slice(0, 50));
  console.log('[Firebase] Key has newlines:', privateKey.includes('\n'));

  // Ensure BEGIN and END markers are present
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FIREBASE_PRIVATE_KEY missing BEGIN marker');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
}

export const db = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
