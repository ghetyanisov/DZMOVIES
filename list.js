const L = require('./lib');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const kind = q.kind === 'tv' ? 'tv' : 'movie';
  const page = Math.min(500, Math.max(1, parseInt(q.page, 10) || 1));
  let path, params = { page };

  if (q.q) {
    path = 'search/' + kind;
    params.query = String(q.q).slice(0, 100);
  } else if (q.genre) {
    const g = L.GENRES[q.genre];
    if (!g || !g[kind]) return L.json({ error: 'genre' }, 400);
    path = 'discover/' + kind;
    params.with_genres = g[kind];
    params.sort_by = 'popularity.desc';
  } else if (q.cat === 'trending') {
    path = 'trending/' + kind + '/week';
  } else {
    path = kind + '/' + (q.cat === 'top_rated' ? 'top_rated' : 'popular');
  }

  const d = await L.tmdb(path, params);
  if (!d) return L.json({ error: 'tmdb' }, 502, 'no-store');
  return L.json({
    items: (d.results || []).map((r) => L.item(r, kind)),
    page,
    total: Math.min(500, d.total_pages || 1),
  });
};
