// Overpass proxy — brauzerdan to'g'ridan-to'g'ri chaqirish CORS va 504/406
// sabab ishonchsiz. Mirrorlar ham tez-tez o'zgaradi (biri o'lik, biri sekin),
// shuning uchun hammasini PARALLEL so'raymiz va birinchi muvaffaqiyatlisini
// olamiz (Promise.any). Natija 1 kun keshlanadi — infratuzilma kam o'zgaradi.
const MIRRORS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function tryMirror(url, q, signal) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(q),
    signal,
  });
  if (!r.ok) throw new Error('status ' + r.status);
  const data = await r.json();
  if (!data || !Array.isArray(data.elements)) throw new Error('bad payload');
  return data;
}

export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!isFinite(lat) || !isFinite(lng)) {
    return res.status(400).json({ error: 'lat va lng kerak' });
  }

  const q = `[out:json][timeout:20];(node["amenity"="school"](around:1000,${lat},${lng});node["amenity"="hospital"](around:1000,${lat},${lng});node["amenity"="supermarket"](around:1000,${lat},${lng});node["railway"="station"](around:1000,${lat},${lng});node["highway"="bus_stop"](around:800,${lat},${lng});node["leisure"="park"](around:1000,${lat},${lng}););out body;`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000); // Vercel funksiya limitidan past
  try {
    const data = await Promise.any(MIRRORS.map((u) => tryMirror(u, q, ctrl.signal)));
    clearTimeout(tid);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(data);
  } catch {
    clearTimeout(tid);
    return res.status(502).json({ error: 'Overpass mirrors unavailable' });
  }
}
