(function () {
  var SITE = 'سينما بلس';
  var app = document.getElementById('app');
  // [الرمز, الاسم, هل يتوفر للمسلسلات]
  var GEN = [['action','أكشن',1],['horror','رعب',1],['drama','دراما',1],['comedy','كوميديا',1],['scifi','خيال علمي',1],
             ['romance','رومانسي',0],['thriller','إثارة',0],['animation','رسوم متحركة',1],['crime','جريمة',1]];
  var LOADING = '<div class="loading">جاري التحميل...</div>';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var api = function (p) { return fetch('/api/' + p).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
  var link = function (href, text, cls) { return '<a href="' + esc(href) + '" data-link' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>'; };

  var card = function (i) {
    return '<a class="card" href="/watch/' + i.t + '" data-link><div class="pw"><img loading="lazy" src="' + esc(i.p) + '" alt="' + esc(i.title) + '"></div>'
      + '<span class="rate">★ ' + i.rate + '</span><div class="info"><b>' + esc(i.title) + '</b><small>' + esc(i.year) + '</small></div></a>';
  };
  var grid = function (items) { return items && items.length ? '<div class="grid">' + items.map(card).join('') + '</div>' : '<p>لا توجد نتائج.</p>'; };
  var withQuery = function (patch) {
    var u = new URLSearchParams(location.search);
    Object.keys(patch).forEach(function (k) { patch[k] == null ? u.delete(k) : u.set(k, patch[k]); });
    var s = u.toString();
    return location.pathname + (s ? '?' + s : '');
  };

  // ---------- الشريط العلوي ----------
  document.getElementById('chips').innerHTML = GEN.map(function (g) { return link('/genre/' + g[0], g[1]); }).join('');
  function markActive() {
    var path = location.pathname;
    document.querySelectorAll('#chips a, #nav a').forEach(function (a) {
      var h = a.getAttribute('href');
      a.classList.toggle('on', h === '/' ? path === '/' : path === h);
    });
  }

  // ---------- الصفحات ----------
  function home() {
    document.title = SITE;
    app.innerHTML = LOADING;
    var S = [
      ['أفلام رائجة', 'kind=movie&cat=trending', '/movies'],
      ['مسلسلات رائجة', 'kind=tv&cat=trending', '/series'],
      ['أفلام رعب', 'kind=movie&genre=horror', '/genre/horror'],
      ['أفلام أكشن', 'kind=movie&genre=action', '/genre/action'],
      ['مسلسلات دراما', 'kind=tv&genre=drama', '/genre/drama?type=tv'],
      ['أفلام كوميديا', 'kind=movie&genre=comedy', '/genre/comedy'],
      ['مسلسلات الأكشن والمغامرة', 'kind=tv&genre=action', '/genre/action?type=tv'],
      ['أفلام الأعلى تقييماً', 'kind=movie&cat=top_rated', '/movies?cat=top_rated'],
    ];
    Promise.all(S.map(function (s) { return api('list?' + s[1]); })).then(function (res) {
      app.innerHTML = S.map(function (s, i) {
        return res[i] ? '<h2>' + s[0] + ' ' + link(s[2], 'المزيد', 'more') + '</h2>' + grid(res[i].items.slice(0, 12)) : '';
      }).join('') || '<p>تعذر تحميل البيانات.</p>';
    });
  }

  function browse(o) {
    var qs = new URLSearchParams(location.search);
    var page = Math.max(1, parseInt(qs.get('page'), 10) || 1);
    var kind = o.kind || (qs.get('type') === 'tv' ? 'tv' : 'movie');
    var cat = qs.get('cat') === 'top_rated' ? 'top_rated' : 'popular';
    var q = o.search ? (qs.get('q') || '') : '';
    var title, tabs = '';

    if (o.genre) {
      var g = GEN.filter(function (x) { return x[0] === o.genre; })[0];
      if (!g) return notFound();
      if (kind === 'tv' && !g[2]) kind = 'movie';
      title = g[1] + ' - ' + (kind === 'tv' ? 'مسلسلات' : 'أفلام');
      if (g[2]) tabs = link(withQuery({ type: 'movie', page: null }), 'أفلام', kind === 'movie' ? 'on' : '') + link(withQuery({ type: 'tv', page: null }), 'مسلسلات', kind === 'tv' ? 'on' : '');
    } else if (o.search) {
      title = 'بحث: ' + q;
      tabs = link(withQuery({ type: 'movie', page: null }), 'أفلام', kind === 'movie' ? 'on' : '') + link(withQuery({ type: 'tv', page: null }), 'مسلسلات', kind === 'tv' ? 'on' : '');
    } else {
      title = kind === 'tv' ? 'مسلسلات' : 'أفلام';
      tabs = link(withQuery({ cat: null, page: null }), 'الأكثر شعبية', cat === 'popular' ? 'on' : '') + link(withQuery({ cat: 'top_rated', page: null }), 'الأعلى تقييماً', cat === 'top_rated' ? 'on' : '');
    }
    var p = 'kind=' + kind + '&page=' + page + (o.genre ? '&genre=' + o.genre : o.search ? '&q=' + encodeURIComponent(q) : '&cat=' + cat);

    document.title = title + ' | ' + SITE;
    app.innerHTML = LOADING;
    api('list?' + p).then(function (d) {
      if (!d) { app.innerHTML = '<p>تعذر تحميل البيانات.</p>'; return; }
      var pager = '<div class="pager">' + (page > 1 ? link(withQuery({ page: page - 1 }), '« السابق') : '') + '<span>' + page + ' / ' + d.total + '</span>' + (page < d.total ? link(withQuery({ page: page + 1 }), 'التالي »') : '') + '</div>';
      app.innerHTML = '<h2>' + esc(title) + '</h2>' + (tabs ? '<div class="tabs">' + tabs + '</div>' : '') + grid(d.items) + pager;
    });
  }

  function watch(token) {
    app.innerHTML = LOADING;
    var nosb = new URLSearchParams(location.search).get('nosb') === '1';
    api('detail?t=' + encodeURIComponent(token)).then(function (d) {
      if (!d) return notFound();
      document.title = d.title + ' | ' + SITE;
      var meta = '★ ' + d.rate + (d.year ? ' • ' + esc(d.year) : '') + (d.runtime ? ' • ' + d.runtime + ' دقيقة' : '') + (d.seasonsCount ? ' • ' + d.seasonsCount + ' مواسم' : '');
      var h = '<div class="hero" style="background-image:linear-gradient(rgba(0,0,0,.7),#0d0f14),url(' + esc(d.backdrop) + ')">'
        + '<img class="poster" src="' + esc(d.poster) + '" alt=""><div><h1>' + esc(d.title) + '</h1><p class="meta">' + meta + '</p>'
        + '<p class="tags">' + d.genres.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>'
        + '<p>' + esc(d.overview || 'لا يوجد وصف متاح.') + '</p>'
        + (d.cast.length ? '<p class="meta">الممثلون: ' + esc(d.cast.join('، ')) + '</p>' : '') + '</div></div>';
      h += '<div class="player"><iframe src="/player?t=' + encodeURIComponent(d.pt) + (nosb ? '&nosb=1' : '') + '" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen webkitallowfullscreen mozallowfullscreen scrolling="no" frameborder="0"></iframe></div>';
      h += '<p class="hint">' + (nosb ? link(location.pathname, 'تفعيل وضع الحماية') : 'الفيديو لا يعمل على جهازك؟ ' + link(location.pathname + '?nosb=1', 'جرّب الوضع المتوافق')) + '</p>';
      if (d.type === 'tv') {
        h += '<div class="tabs">' + d.seasons.map(function (s) { return link('/watch/' + s.t, 'الموسم ' + s.n, s.n === d.season ? 'on' : ''); }).join('') + '</div>';
        h += '<div class="eps">' + d.episodes.map(function (ep) { return link('/watch/' + ep.t, ep.n + '. ' + esc(ep.name), ep.n === d.episode ? 'on' : ''); }).join('') + '</div>';
      }
      if (d.similar.length) h += '<h2>مشابه</h2>' + grid(d.similar);
      app.innerHTML = h;
    });
  }

  function notFound() { document.title = 'غير موجود | ' + SITE; app.innerHTML = '<p>المحتوى غير موجود.</p>'; }

  // ---------- التوجيه ----------
  function route() {
    var p = location.pathname.replace(/\/+$/, '') || '/', m;
    markActive();
    if (p === '/') return home();
    if (p === '/movies') return browse({ kind: 'movie' });
    if (p === '/series') return browse({ kind: 'tv' });
    if (p === '/search') return browse({ search: true });
    if ((m = p.match(/^\/genre\/([a-z]+)$/))) return browse({ genre: m[1] });
    if ((m = p.match(/^\/watch\/([\w-]+)$/))) return watch(m[1]);
    notFound();
  }
  function go(u) { history.pushState(null, '', u); route(); window.scrollTo(0, 0); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
  window.addEventListener('popstate', route);
  document.getElementById('sf').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = document.getElementById('sq').value.trim();
    if (q) go('/search?q=' + encodeURIComponent(q) + '&type=' + document.getElementById('st').value);
  });
  route();
})();
