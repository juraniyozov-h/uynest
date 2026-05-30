import { db } from '../lib/firebase.js';

export default async function handler(req, res) {
  try {
    const snap = await db.collection('listings').where('status', '==', 'approved').limit(1000).get();
    const base = 'https://uynest.vercel.app';
    const now = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: base, priority: '1.0', changefreq: 'daily' },
      { loc: `${base}/rent`, priority: '0.9', changefreq: 'daily' },
      { loc: `${base}/sale`, priority: '0.9', changefreq: 'daily' },
      { loc: `${base}/map`, priority: '0.7', changefreq: 'weekly' },
    ];

    const listingUrls = snap.docs.map(doc => ({
      loc: `${base}/listing/${doc.id}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: doc.data().updatedAt ? doc.data().updatedAt.split('T')[0] : now,
    }));

    const allUrls = [...staticUrls, ...listingUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}
