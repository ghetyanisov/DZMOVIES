const L = require('./lib');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.handler = async (event) => {
  const h = event.headers || {};
  const q = event.queryStringParameters || {};
  const deny = () => ({ statusCode: 403, headers: { 'content-type': 'text/plain' }, body: '403' });

  const p = L.dec(q.t);
  if (!p || !p.x || p.x < Date.now()) return deny();                       // رمز منتهي أو غير صالح
  const dest = h['sec-fetch-dest'];
  if (dest && dest !== 'iframe') return deny();                            // منع الفتح المباشر
  if (h.referer) {                                                         // Referer اختياري (يحذفه بعض متصفحات الهاتف)
    try {
      const rh = new URL(h.referer).host;
      if (rh !== h.host && rh !== h['x-forwarded-host']) return deny();
    } catch (e) { /* تجاهل */ }
  }

  const type = p.type === 'tv' ? 'tv' : 'movie';
  const url = L.playerUrl(type, p.id | 0, Math.max(1, p.s | 0), Math.max(1, p.e | 0));
  const sb = L.SANDBOX && !q.nosb ? ' sandbox="' + esc(L.SANDBOX) + '"' : '';

  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style>'
    + '<script src="/protect.js"></script></head><body>'
    + '<iframe src="' + esc(url) + '"' + sb + ' allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen webkitallowfullscreen mozallowfullscreen referrerpolicy="origin"></iframe></body></html>';

  return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }, body: html };
};
