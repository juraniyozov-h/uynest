import { db } from '../../lib/firebase.js';
import { sendTelegramMessage } from '../../lib/telegram.js';

// Called when a new listing is approved - checks saved searches
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { listing } = req.body || {};
  if (!listing) return res.status(400).json({ error: 'listing kerak' });

  try {
    const snap = await db.collection('saved_searches').where('notifyTelegram', '==', true).get();
    const matches = [];

    for (const doc of snap.docs) {
      const search = doc.data();
      const f = search.filters || {};

      // Check if listing matches filters
      const typeMatch = !f.type || f.type === listing.type;
      const districtMatch = !f.district || f.district === listing.district;
      const minPriceMatch = !f.minPrice || listing.price >= f.minPrice;
      const maxPriceMatch = !f.maxPrice || listing.price <= f.maxPrice;
      const roomsMatch = !f.rooms || listing.rooms >= f.rooms;

      if (typeMatch && districtMatch && minPriceMatch && maxPriceMatch && roomsMatch) {
        matches.push({ userId: search.userId, searchId: doc.id });
      }
    }

    // Send notifications
    for (const match of matches) {
      const userRef = await db.collection('users').doc(match.userId).get();
      const user = userRef.data();
      if (!user?.telegramChatId) continue;

      const msg = `🔔 Yangi mos e'lon topildi!\n\n<b>${listing.title}</b>\n📍 ${listing.district}\n💰 $${listing.price}${listing.type === 'rent' ? '/oy' : ''}\n🛏 ${listing.rooms} xona • ${listing.area} m²\n\n👉 ${process.env.VITE_FRONTEND_URL}/listing/${listing.id}`;
      await sendTelegramMessage(user.telegramChatId, msg);

      // Update lastNotifiedAt
      await db.collection('saved_searches').doc(match.searchId).update({ lastNotifiedAt: new Date() });
    }

    res.json({ ok: true, notified: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}
