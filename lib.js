const crypto = require('crypto');

// ===== الإعدادات (يُفضّل ضبطها من Netlify > Site settings > Environment variables) =====
const TMDB_KEY = process.env.TMDB_KEY || '591773e78a0d8896a88068749d1f1c59';
const SECRET = process.env.SECRET_KEY || '2b00b1a3b712d3d9693a5426a46e8c674bfbf897fab8a26b8e611cd2b6ddcee3';
const LANG = process.env.TMDB_LANG || 'ar';
const PLAYER_MOVIE = process.env.PLAYER_MOVIE || 'https://web.nxsha.app/embed/movie/{id}';
const PLAYER_TV = process.env.PLAYER_TV || 'https://web.nxsha.app/embed/tv/{id}/{season}/{episode}';
const PLAYER_PARAMS = { server: 'MbPly-', lang: 'eng', sub: 'ar', autoplay: 'true', audio: 'true' };
const SANDBOX = process.env.PLAYER_SANDBOX !== undefined
  ? process.env.PLAYER_SANDBOX
  : 'allow-scripts allow-same-origin allow-forms allow-presentation';

// الأقسام: معرّفات التصنيفات في TMDB (null = غير متوفر للمسلسلات)
const GENRES = {
  action: { movie: 28, tv: 10759 },
  horror: { movie: 27, tv: 9648 },     // للمسلسلات: غموض/رعب
  drama: { movie: 18, tv: 18 },
  comedy: { movie: 35, tv: 35 },
  scifi: { movie: 878, tv: 10765 },
  romance: { movie: 10749, tv: null },
  thriller: { movie: 53, tv: null },
  animation: { movie: 16, tv: 16 },
  crime: { movie: 80, tv: 80 },
};

// ===== تشفير الروابط AES-256-GCM (ناتج ثابت لنفس المدخلات) =====
const key = crypto.createHash('sha256').update(SECRET).digest();
const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function enc(obj) {
  const plain = Buffer.from(JSON.stringify(obj));
  const iv = crypto.createHmac('sha256', key).update(plain).digest().subarray(0, 12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return b64u(Buffer.concat([iv, c.getAuthTag(), ct]));
}
function dec(t) {
  try {
    const raw = unb64u(t || '');
    if (raw.length < 29) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString());
  } catch (e) { return null; }
}

// ===== TMDB مع كاش بسيط في الذاكرة =====
const cache = new Map();
async function tmdb(path, params = {}) {
  const u = new URL('https://api.themoviedb.org/3/' + path);
  Object.entries({ ...params, api_key: TMDB_KEY, language: LANG }).forEach(([k, v]) => u.searchParams.set(k, v));
  const k = u.toString();
  const hit = cache.get(k);
  if (hit && Date.now() - hit.t < 600000) return hit.d;
  try {
    const r = await fetch(k);
    if (!r.ok) return null;
    const d = await r.json();
    cache.set(k, { t: Date.now(), d });
    return d;
  } catch (e) { return null; }
}

const img = (p, s = 'w342') => (p ? 'https://image.tmdb.org/t/p/' + s + p : 'https://placehold.co/342x513?text=No+Image');
const json = (b, status = 200, cc = 'public, max-age=300') => ({
  statusCode: status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cc },
  body: JSON.stringify(b),
});
const item = (r, type) => ({
  t: enc({ type, id: r.id, s: 1, e: 1 }),
  title: r.title || r.name || '',
  year: (r.release_date || r.first_air_date || '').slice(0, 4),
  rate: (r.vote_average || 0).toFixed(1),
  p: img(r.poster_path),
});
function playerUrl(type, id, s, e) {
  let u = (type === 'movie' ? PLAYER_MOVIE : PLAYER_TV).replace('{id}', id).replace('{season}', s).replace('{episode}', e);
  return u + (u.includes('?') ? '&' : '?') + new URLSearchParams(PLAYER_PARAMS).toString();
}

module.exports = { enc, dec, tmdb, img, json, item, playerUrl, GENRES, SANDBOX };
