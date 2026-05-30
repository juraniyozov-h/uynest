import { db } from '../../lib/firebase.js';
import { sendTelegramMessage } from '../../lib/telegram.js';

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7258242669';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body || {};
  if (!message) return res.status(200).json({ ok: true });

  const chatId = String(message.chat?.id || '');
  const text = (message.text || '').trim();
  const parts = text.split(/\s+/);

  if (parts[0] === '/start' && parts[1]) {
    const code = parts[1];
    try {
      // Search by code field
      const snap = await db.collection('telegram_codes')
        .where('code', '==', code)
        .where('used', '==', false)
        .get();

      if (snap.empty) {
        await sendTelegramMessage(chatId, '❌ Kod noto\'g\'ri yoki muddati o\'tgan.\n\nUynest profilingizdan yangi kod oling.');
        return res.status(200).json({ ok: true });
      }

      const codeDoc = snap.docs[0];
      const data = codeDoc.data();

      // Check expiry — stored as ISO string
      const expiresAt = data.expiresAt
        ? (typeof data.expiresAt === 'string' ? new Date(data.expiresAt).getTime() : data.expiresAt.toMillis?.() || 0)
        : 0;

      if (Date.now() > expiresAt) {
        await codeDoc.ref.update({ used: true });
        await sendTelegramMessage(chatId, '⏱ Kodning muddati o\'tgan (10 daqiqa).\n\nUynest profilingizdan yangi kod oling.');
        return res.status(200).json({ ok: true });
      }

      // Link Telegram chatId to user
      await db.collection('users').doc(data.userId).update({ telegramChatId: chatId });
      await codeDoc.ref.update({ used: true });

      await sendTelegramMessage(chatId,
        '✅ <b>Muvaffaqiyatli ulandi!</b>\n\nEndi Uynest bildirishnomalari Telegramga keladi:\n\n' +
        '📬 Yangi xabar\n✅ E\'lon tasdiqlandi\n📅 Ko\'rik so\'rovi\n🔔 Mos e\'lon topildi\n⚠️ E\'lon muddati tugamoqda'
      );

      // Notify admin
      await sendTelegramMessage(ADMIN_CHAT_ID,
        `🔗 <b>Yangi Telegram ulandi</b>\n👤 User ID: ${data.userId}`
      );
    } catch (err) {
      console.error('Webhook error:', err);
      await sendTelegramMessage(chatId, '❌ Server xatosi yuz berdi. Keyinroq urinib ko\'ring.');
    }
  } else if (parts[0] === '/start') {
    await sendTelegramMessage(chatId,
      '👋 <b>Uynest botiga xush kelibsiz!</b>\n\nTelegramni ulaish uchun:\n1. uynest.vercel.app saytiga kiring\n2. Profil → Bildirishnomalar\n3. "Telegram ulash" tugmasini bosing\n4. Olingan kodni /start <KOD> formatida yuboring'
    );
  } else {
    await sendTelegramMessage(chatId,
      'Kod yuborish uchun:\n<code>/start 123456</code>\n\nKodni Profil → Bildirishnomalar bo\'limidan oling.'
    );
  }

  res.status(200).json({ ok: true });
}
