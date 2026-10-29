const L = require('./lib');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const t = L.dec(q.t);
  if (!t || !t.id) return L.json({ error: 'not_found' }, 404, 'no-store');
  const type = t.type === 'tv' ? 'tv' : 'movie';
  const s = Math.max(1, t.s | 0), e = Math.max(1, t.e | 0);

  const d = await L.tmdb(type + '/' + t.id, { append_to_response: 'credits' });
  if (!d) return L.json({ error: 'not_found' }, 404, 'no-store');

  const out = {
    type,
    title: d.title || d.name || '',
    overview: d.overview || '',
    rate: (d.vote_average || 0).toFixed(1),
    year: (d.release_date || d.first_air_date || '').slice(0, 4),
    runtime: d.runtime || null,
    seasonsCount: d.number_of_seasons || null,
    genres: (d.genres || []).map((g) => g.name),
    cast: ((d.credits && d.credits.cast) || []).slice(0, 8).map((c) => c.name),
    backdrop: L.img(d.backdrop_path, 'w1280'),
    poster: L.img(d.poster_path, 'w342'),
    season: s,
    episode: e,
    // رمز المشغّل صالح 6 ساعات
    pt: L.enc({ type, id: t.id, s, e, x: Date.now() + 6 * 3600 * 1000 }),
  };

  if (type === 'tv') {
    out.seasons = (d.seasons || []).filter((x) => x.season_number > 0)
      .map((x) => ({ n: x.season_number, t: L.enc({ type, id: t.id, s: x.season_number, e: 1 }) }));
    const sd = await L.tmdb('tv/' + t.id + '/season/' + s);
    out.episodes = ((sd && sd.episodes) || [])
      .map((x) => ({ n: x.episode_number, name: x.name || '', t: L.enc({ type, id: t.id, s, e: x.episode_number }) }));
  }

  const sim = await L.tmdb(type + '/' + t.id + '/similar');
  out.similar = ((sim && sim.results) || []).slice(0, 12).map((r) => L.item(r, type));
  return L.json(out, 200, 'no-store');
};
