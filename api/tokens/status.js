import { db } from '../../lib/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId kerak' });

  if (req.method === 'GET') {
    try {
      const ref = db.collection('tokens').doc(userId);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.json({ freeTokens: 3, paidTokens: 0, resetAt: null });
      }
      const data = snap.data();
      const now = Date.now();
      if (data.resetAt && now >= data.resetAt.toMillis()) {
        await ref.update({ freeTokens: 3, firstUsedAt: null, resetAt: null });
        return res.json({ freeTokens: 3, paidTokens: data.paidTokens || 0, resetAt: null });
      }
      return res.json({
        freeTokens: data.freeTokens ?? 3,
        paidTokens: data.paidTokens || 0,
        resetAt: data.resetAt?.toDate()?.toISOString() || null
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server xatosi' });
    }
  }

  if (req.method === 'POST') {
    // Use a token
    try {
      const ref = db.collection('tokens').doc(userId);
      const snap = await ref.get();
      const now = new Date();
      const resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (!snap.exists) {
        await ref.set({ freeTokens: 2, paidTokens: 0, firstUsedAt: FieldValue.serverTimestamp(), resetAt, updatedAt: FieldValue.serverTimestamp() });
        return res.json({ ok: true, remaining: 2 });
      }

      const data = snap.data();
      const free = data.freeTokens ?? 3;
      const paid = data.paidTokens || 0;

      if (free > 0) {
        const updates = { freeTokens: free - 1, updatedAt: FieldValue.serverTimestamp() };
        if (!data.firstUsedAt) { updates.firstUsedAt = FieldValue.serverTimestamp(); updates.resetAt = resetAt; }
        await ref.update(updates);
        return res.json({ ok: true, remaining: free - 1 + paid });
      } else if (paid > 0) {
        await ref.update({ paidTokens: paid - 1, updatedAt: FieldValue.serverTimestamp() });
        return res.json({ ok: true, remaining: paid - 1 });
      }
      return res.json({ ok: false, error: 'Token tugadi' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server xatosi' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
