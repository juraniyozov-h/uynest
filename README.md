# 🏠 UyNest — Ko'chmas mulk platformasi

O'zbekistonda uy-joy ijara va sotib olish platformasi. Toshkent va boshqa shaharlar bo'yicha e'lonlar, AI yordamchi, real-vaqt chat va Telegram bildirishnomalar.

**Live:** [uynest.vercel.app](https://uynest.vercel.app)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind CSS 4 |
| Auth / DB | Firebase (Firestore, Auth, Storage) |
| AI | Groq (Llama 3.3 70B) + Groq Whisper |
| Maps | Leaflet + OpenStreetMap (Nominatim) |
| Deploy | Vercel (Serverless Functions) |
| Notifications | Telegram Bot API |
| i18n | i18next (UZ / RU) |
| PWA | vite-plugin-pwa (Workbox) |

---

## Features

- 🔍 **Listings** — Rent & sale with filters (property type, region, rooms, price)
- 🗺️ **Map** — Interactive map with AI-powered location search
- 🤖 **AI Assistant** — Groq LLM answers questions with real listing data
- 💬 **Chat** — Real-time messaging between users and admin with image/video sharing
- 🔔 **Telegram notifications** — Connect Telegram account to receive alerts
- 👤 **Profiles** — User dashboard, listings management, premium badges
- 🌐 **Bilingual** — Full Uzbek and Russian UI
- 📱 **PWA** — Installable on iOS/Android from browser
- 🏗️ **Admin panel** — Listing moderation, user management, analytics

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (frontend only)
npm run dev

# Start with API routes (recommended)
npx vercel dev
```

> **Note:** Chat media uploads and Telegram webhook require `FIREBASE_PRIVATE_KEY` (set via Vercel env vars).

---

## Environment Variables

Create `.env` from the template below:

```env
# Firebase (client)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=
VITE_TELEGRAM_BOT_USERNAME=

# Groq AI
VITE_GROQ_API_KEY=

# Firebase Admin (for Vercel serverless functions)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=

# Telegram Admin
TELEGRAM_BOT_TOKEN=
ADMIN_CHAT_ID=

# App URL
VITE_FRONTEND_URL=https://uynest.vercel.app
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tg` | POST | Send Telegram message |
| `/api/telegram/webhook` | POST | Telegram bot webhook |
| `/api/upload-media` | POST | Upload image/video to Firebase Storage |
| `/api/sitemap` | GET | XML sitemap from Firestore listings |

---

## Project Structure

```
/
├── src/
│   ├── App.tsx          # Main app (all pages & components)
│   ├── i18n.ts          # UZ/RU translations
│   ├── firebase.ts      # Firebase client config
│   └── store/
│       ├── appStore.ts  # State management & APIs
│       └── imageUpload.ts
├── api/
│   ├── tg.js            # Telegram message proxy
│   ├── telegram/
│   │   └── webhook.js   # Telegram bot webhook
│   ├── upload-media.js  # Media upload to Firebase Storage
│   └── sitemap.js       # XML sitemap generator
├── lib/
│   ├── firebase.js      # Firebase Admin SDK init
│   └── telegram.js      # Telegram API helper
└── public/              # PWA icons, logo
```

---

## Deploy

```bash
# Push to GitHub — Vercel auto-deploys on push to main
git push origin main

# Manual deploy to production
npx vercel --prod
```

---

## License

Private project — © 2026 UyNest. All rights reserved.
