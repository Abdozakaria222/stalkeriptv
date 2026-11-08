/* Stalker TV — media layer: hub, movies, series, favorites, detail, VOD player, quality menu, settings */
(function () {
'use strict';
var T = window.__tv;
var $ = T.$, el = T.el, esc = T.esc, t = T.t, Store = T.Store, S = T.S, Nav = T.Nav, Player = T.Player, Prefs = T.Prefs, go = T.go, toast = T.toast, Quality = T.Quality;

/* ======================================================================
 * strings
 * ==================================================================== */
var AR = {
  hubLive: 'القنوات المباشرة', hubMovies: 'الأفلام', hubSeries: 'المسلسلات', hubFavs: 'المفضلة', continueW: 'تابع المشاهدة', settingsT: 'الإعدادات', switchAcc: 'تغيير الحساب',
  added: 'أُضيف حديثاً', results: 'نتائج البحث', loadingMovies: 'جاري تحميل الأفلام…', loadingSeries: 'جاري تحميل المسلسلات…', empty: 'لا يوجد شيء هنا',
  resume: 'استكمال', restart: 'من البداية', addFav: 'أضف للمفضلة', inFav: 'في المفضلة', season: 'الموسم', episode: 'الحلقة', cast: 'الأبطال', director: 'الإخراج', min: 'د',
  nextEp: 'الحلقة التالية', prevEp: 'الحلقة السابقة', quality: 'الجودة', audio: 'الصوت', auto: 'تلقائي', menuTitle: 'خيارات التشغيل', onlyOne: 'هذا البث له جودة واحدة',
  autoNext: 'تشغيل الحلقة التالية تلقائياً', resumePlay: 'استكمال من حيث توقفت', fastStart: 'بدء سريع للبث', clearHist: 'مسح سجل المشاهدة', histCleared: 'تم مسح السجل',
  defQuality: 'الجودة الافتراضية', ui: 'الواجهة', playback: 'التشغيل', conn: 'الاتصال', accountT: 'الحساب', on: 'مفعّل', off: 'متوقف', lang2: 'اللغة',
  aspect: 'ملاءمة الشاشة', aspFit: 'تلقائي (الأصلي)', aspFill: 'تمديد لملء الشاشة', aspZoom: 'تكبير (قص الأطراف)', asp169: 'عرض 16:9', asp43: 'عرض 4:3', asp219: 'عرض 21:9', aspNote: 'يغيّر طريقة عرض الصورة لتناسب شاشتك: تمديد يملأ الشاشة، وتكبير يقصّ الأطراف بدون أشرطة سوداء.', perf: 'وضع الأداء (أسرع)', perfNote: 'يوقف الحركات والانتقالات لتنقّل فوري، ويُنصح به في التلفزيونات الضعيفة.', qualNote: 'تنطبق الجودة على بثوث HLS فقط، أما باقي الصيغ فلها جودة واحدة.', fastNote: 'يقلل زمن الانتظار قبل ظهور الصورة، وقد يزيد التقطيع على الإنترنت الضعيف.',
  chWord: 'قناة', movWord: 'فيلم', serWord: 'مسلسل', catWord: 'قسم', itemsWord: 'عنصر', editAcc: 'تعديل الحساب الحالي', relayRow: 'إعداد الريلاي',
  hintRows: 'للتفاصيل', hintSeek: 'تقديم / ترجيع', hintPause: 'إيقاف مؤقت', hintMenu: 'الجودة والصوت', playingNext: 'الحلقة التالية…', changed: 'الجودة', retryHint: 'تعذّر التشغيل. جرّب جودة أخرى (▲) أو ارجع.',
  hello: 'أهلاً بك', q1080: '1080p', watched: 'تمت المشاهدة', sNum: 'م', eNum: 'ح'
};
var EN = {
  hubLive: 'Live TV', hubMovies: 'Movies', hubSeries: 'Series', hubFavs: 'Favorites', continueW: 'Continue watching', settingsT: 'Settings', switchAcc: 'Switch account',
  added: 'Recently added', results: 'Search results', loadingMovies: 'Loading movies…', loadingSeries: 'Loading series…', empty: 'Nothing here',
  resume: 'Resume', restart: 'From start', addFav: 'Add to favorites', inFav: 'In favorites', season: 'Season', episode: 'Episode', cast: 'Cast', director: 'Director', min: 'min',
  nextEp: 'Next episode', prevEp: 'Previous episode', quality: 'Quality', audio: 'Audio', auto: 'Auto', menuTitle: 'Playback options', onlyOne: 'This stream has a single quality',
  autoNext: 'Autoplay next episode', resumePlay: 'Resume where you stopped', fastStart: 'Fast start', clearHist: 'Clear watch history', histCleared: 'History cleared',
  defQuality: 'Default quality', ui: 'Interface', playback: 'Playback', conn: 'Connection', accountT: 'Account', on: 'On', off: 'Off', lang2: 'Language',
  aspect: 'Screen fit', aspFit: 'Auto (original)', aspFill: 'Stretch to fill', aspZoom: 'Zoom (crop edges)', asp169: 'Force 16:9', asp43: 'Force 4:3', asp219: 'Force 21:9', aspNote: 'Changes how the picture fits your screen: stretch fills it, zoom crops the edges with no black bars.', perf: 'Performance mode (faster)', perfNote: 'Turns off animations and transitions for instant navigation; recommended on weaker TVs.', qualNote: 'Quality applies to HLS streams only; other formats have a single quality.', fastNote: 'Shortens the wait before the picture appears; may stutter on slow internet.',
  chWord: 'channels', movWord: 'movies', serWord: 'series', catWord: 'categories', itemsWord: 'items', editAcc: 'Edit current account', relayRow: 'Relay setup',
  hintRows: 'Details', hintSeek: 'Seek', hintPause: 'Pause', hintMenu: 'Quality & audio', playingNext: 'Next episode…', changed: 'Quality', retryHint: 'Could not play. Try another quality (▲) or go back.',
  hello: 'Welcome', q1080: '1080p', watched: 'Watched', sNum: 'S', eNum: 'E'
};
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

/* ======================================================================
 * helpers
 * ==================================================================== */
function rtl() { return T.getLang() === 'ar'; }
function pad(n) { return ('0' + n).slice(-2); }
function fmtMs(ms) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60; return (h ? h + ':' : '') + pad(m) + ':' + pad(s); }
function isX() { return S.acc && S.acc.type === 'xtream'; }
function absUrl(u) {
  u = String(u || ''); if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u; if (u.indexOf('//') === 0) return 'http:' + u;
  var m = String(S.portal && S.portal.root || '').match(/^(https?:\/\/[^\/]+)/); if (!m) return '';
  return m[1] + (u.charAt(0) === '/' ? '' : '/') + u;
}
function btnStep(k) { return k === 'right' ? (rtl() ? -1 : 1) : (rtl() ? 1 : -1); }
function noop() {}
function clockTxt() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

/* ======================================================================
 * data layer (Xtream + Stalker VOD / series)
 * ==================================================================== */
var X = T.Xtream.prototype, P = T.Portal.prototype;

X.vodCats = function (kind) {
  return this.req(kind === 'series' ? 'get_series_categories' : 'get_vod_categories').then(function (a) {
    return (Array.isArray(a) ? a : []).map(function (c) { return { id: String(c.category_id), title: c.category_name || '' }; });
  });
};
X.vodAll = function (kind, cat) {
  var isS = kind === 'series';
  return this.req(isS ? 'get_series' : 'get_vod_streams', cat ? { category_id: cat } : null, 120000).then(function (a) {
    if (!Array.isArray(a)) throw T.mkErr('parse');
    var out = [];
    a.forEach(function (c) {
      var name = String(c.name || c.title || '').replace(/^\s+|\s+$/g, ''); if (!name) return;
      if (isS) out.push({ kind: 'series', id: String(c.series_id), name: name, poster: c.cover || '', cat: String(c.category_id), rating: c.rating || '', year: String(c.releaseDate || c.year || '').slice(0, 4),
        added: Number(c.last_modified) || 0, plot: c.plot || '', backdrop: (c.backdrop_path && c.backdrop_path[0]) || '' });
      else out.push({ kind: 'movie', id: String(c.stream_id), name: name, poster: c.stream_icon || '', cat: String(c.category_id), rating: c.rating || '', year: String(c.year || '').slice(0, 4),
        added: Number(c.added) || 0, ext: c.container_extension || 'mp4' });
    });
    return out;
  });
};
/* memory-friendly: one category at a time (3 kept), never the whole catalogue except for an explicit search */
var XPAGE = 40, xcache = { keys: [], map: {} };
X.vodPage = function (kind, cat, page, search) {
  var self = this;
  function slice(arr) { return { items: arr.slice((page - 1) * XPAGE, page * XPAGE), total: arr.length }; }
  if (search) {
    var q = String(search).toLowerCase();
    return this.vodAll(kind).then(function (all) { var r = all.filter(function (x) { return x.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 200); all = null; return { items: r, total: r.length }; });
  }
  var key = (self.acc.id || '') + kind + '|' + cat;
  if (xcache.map[key]) return Promise.resolve(slice(xcache.map[key]));
  return this.vodAll(kind, cat).then(function (arr) {
    arr.sort(function (a, b) { return b.added - a.added; });
    xcache.map[key] = arr; xcache.keys.push(key);
    while (xcache.keys.length > 3) delete xcache.map[xcache.keys.shift()];
    return slice(arr);
  });
};
X.vodInfo = function (it) {
  return this.req('get_vod_info', { vod_id: it.id }).then(function (j) {
    var i = (j && j.info) || {}, md = (j && j.movie_data) || {};
    return { plot: i.plot || i.description || '', cast: i.cast || i.actors || '', director: i.director || '', genre: i.genre || '', year: String(i.releasedate || i.releaseDate || '').slice(0, 4),
      rating: i.rating || '', dur: i.duration || '', backdrop: (i.backdrop_path && i.backdrop_path[0]) || '', poster: i.movie_image || '', ext: md.container_extension };
  }).catch(function () { return {}; });
};
X.seriesInfo = function (it) {
  return this.req('get_series_info', { series_id: it.id }).then(function (j) {
    var i = (j && j.info) || {}, eps = (j && j.episodes) || {}, seasons = [];
    if (Array.isArray(eps)) eps = { '1': eps };
    Object.keys(eps).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (k) {
      seasons.push({ n: Number(k) || 1, eps: (eps[k] || []).map(function (e) {
        var inf = e.info || {};
        return { id: String(e.id), num: Number(e.episode_num) || 0, title: e.title || '', ext: e.container_extension || 'mp4', dur: inf.duration || '', img: inf.movie_image || '', plot: inf.plot || '' };
      }) });
    });
    return { plot: i.plot || '', cast: i.cast || '', director: i.director || '', genre: i.genre || '', year: String(i.releaseDate || '').slice(0, 4), rating: i.rating || '',
      backdrop: (i.backdrop_path && i.backdrop_path[0]) || '', poster: i.cover || '', seasons: seasons };
  }).catch(function () { return { seasons: [] }; });
};
X.vodLink = function (m) {
  var a = this.acc, e = encodeURIComponent;
  return Promise.resolve(this.base + (m.kind === 'episode' ? '/series/' : '/movie/') + e(a.user) + '/' + e(a.pass) + '/' + m.id + '.' + (m.ext || 'mp4'));
};

function stNorm(c, kind) {
  if (!c || !c.name) return null;
  var eps = Array.isArray(c.series) ? c.series : [];
  return { kind: (kind === 'series' || eps.length) ? 'series' : 'movie', id: String(c.id), name: String(c.name).replace(/^\s+|\s+$/g, ''), poster: absUrl(c.screenshot_uri || c.cover || c.logo || ''),
    cmd: c.cmd || '', plot: c.description || '', year: String(c.year || '').slice(0, 4), rating: c.rating_imdb || c.rating_kinopoisk || '', genre: c.genre_str || '', cast: c.actors || '',
    director: c.director || '', dur: c.time ? String(c.time) : '', eps: eps, cat: String(c.category_id || ''), added: 0 };
}
function stType(kind) { return kind === 'series' ? 'series' : 'vod'; }
P.vodCats = function (kind) {
  return this.call(stType(kind), 'get_categories', {}, true).then(function (js) {
    var out = []; (Array.isArray(js) ? js : []).forEach(function (c) { if (c && c.id != null && String(c.id) !== '*') out.push({ id: String(c.id), title: c.title || c.name || String(c.id) }); }); return out;
  });
};
P.vodPage = function (kind, cat, page, search) {
  var prm = { category: cat || '', sortby: 'added', p: page, hd: 0, fav: 0 }; if (search) prm.search = search;
  return this.call(stType(kind), 'get_ordered_list', prm, true).then(function (js) {
    var d = (js && js.data) || [];
    return { items: d.map(function (c) { return stNorm(c, kind); }).filter(Boolean), total: Number(js && js.total_items) || 0 };
  });
};
P.vodInfo = function (it) { return Promise.resolve({ plot: it.plot, cast: it.cast, director: it.director, genre: it.genre, year: it.year, rating: it.rating, dur: it.dur }); };
P.seriesInfo = function (it) {
  var eps = [], i; for (i = 0; i < it.eps.length; i++) { var no = Number(it.eps[i]) || (i + 1); eps.push({ id: it.id + ':' + no, num: no, title: '', ser: no, ext: '', dur: '', img: '', plot: '' }); }
  return Promise.resolve({ plot: it.plot, cast: it.cast, director: it.director, genre: it.genre, year: it.year, rating: it.rating, seasons: [{ n: 1, eps: eps }] });
};
P.vodLink = function (m) {
  return this.call('vod', 'create_link', { cmd: m.cmd, series: m.ser || '', forced_storage: '', disable_ad: 0, download: 0, force_ch_link_check: 0 }, true)
    .then(function (js) { return T.cleanCmd((js && js.cmd) || m.cmd); }).catch(function () { return T.cleanCmd(m.cmd); });
};

function loadKind(kind) {
  S.data = S.data || {};
  if (S.data[kind]) return S.data[kind].promise;
  var p = S.portal, acc = S.acc, d = S.data[kind] = { ready: false }, pr;
  pr = p.vodCats(kind).then(function (c) { d.cats = c; d.items = []; d.lazy = true; });
  d.promise = pr.then(function () { d.ready = true; if (S.acc === acc) updateCounts(); return d; }).catch(function (e) { delete S.data[kind]; throw e; });
  return d.promise;
}

/* ======================================================================
 * history (continue watching) + positions + favorites
 * ==================================================================== */
var Hist = {
  k: function () { return 'hist_' + S.acc.id; },
  all: function () { return Store.get(this.k(), []); },
  save: function (e) { var l = this.all().filter(function (x) { return x.key !== e.key; }); l.unshift(e); Store.set(this.k(), l.slice(0, 40)); },
  remove: function (key) { Store.set(this.k(), this.all().filter(function (x) { return x.key !== key; })); },
  find: function (key) { var l = this.all(), i; for (i = 0; i < l.length; i++) if (l[i].key === key) return l[i]; return null; },
  clear: function () { Store.set(this.k(), []); Store.set('pos_' + S.acc.id, {}); },
  rowItems: function (kind) {
    return this.all().filter(function (e) { return e.kind === kind; }).map(function (e) {
      return { kind: kind, id: e.id, name: e.name, poster: e.poster, cmd: e.cmd, ext: e.ext, cont: true, pos: e.d ? Math.min(1, e.t / e.d) : 0, hist: e, rating: '', eps: e.eps || [] };
    });
  }
};
var Pos = {
  k: function () { return 'pos_' + S.acc.id; },
  get: function (key) { var m = Store.get(this.k(), {}), v = m[key]; return v ? { t: v[0], d: v[1] } : null; },
  set: function (key, t0, d) {
    var m = Store.get(this.k(), {}); m[key] = [Math.round(t0), Math.round(d)];
    var ks = Object.keys(m); if (ks.length > 400) { ks.slice(0, ks.length - 400).forEach(function (x) { delete m[x]; }); }
    Store.set(this.k(), m);
  },
  del: function (key) { var m = Store.get(this.k(), {}); delete m[key]; Store.set(this.k(), m); }
};
var Fav = {
  k: function () { return 'favm_' + S.acc.id; },
  id: function (it) { return it.kind + ':' + it.id; },
  has: function (it) { if (it.kind === 'channel') return !!S.favs[it.id]; return !!Store.get(this.k(), {})[this.id(it)]; },
  toggle: function (it) {
    if (it.kind === 'channel') { if (S.favs[it.id]) delete S.favs[it.id]; else S.favs[it.id] = 1; Store.set('fav_' + S.acc.id, S.favs); return !!S.favs[it.id]; }
    var m = Store.get(this.k(), {}), key = this.id(it), on;
    if (m[key]) { delete m[key]; on = false; }
    else { m[key] = { kind: it.kind, id: it.id, name: it.name, poster: it.poster || '', cmd: it.cmd || '', ext: it.ext || '', eps: it.eps || [], plot: it.plot || '', year: it.year || '', rating: it.rating || '', genre: it.genre || '', cast: it.cast || '', director: it.director || '', dur: it.dur || '', cat: it.cat || '', backdrop: it.backdrop || '' }; on = true; }
    Store.set(this.k(), m); return on;
  },
  items: function (kind) { var m = Store.get(this.k(), {}); return Object.keys(m).map(function (k) { return m[k]; }).filter(function (x) { return x.kind === kind; }); },
  count: function () { var n = 0; S.channels.forEach(function (c) { if (S.favs[c.id]) n++; }); if (!S.liveLoaded) n = Object.keys(S.favs).length; return n + Fav.items('movie').length + Fav.items('series').length; }
};

/* ======================================================================
 * HUB
 * ==================================================================== */
var ICONS = {
  live: '<svg viewBox="0 0 96 96" width="150" height="150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="24" width="80" height="54" rx="10"/><path d="M34 10l14 14 14-14"/><path d="M30 88h36"/><path d="M42 40l16 11-16 11z" fill="#fff"/></svg>',
  movie: '<svg viewBox="0 0 96 96" width="150" height="150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="14" width="72" height="68" rx="10"/><path d="M12 32h72M12 64h72M32 14v18M64 14v18M32 64v18M64 64v18"/><path d="M42 40l16 8-16 8z" fill="#fff"/></svg>',
  series: '<svg viewBox="0 0 96 96" width="150" height="150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="34" width="68" height="46" rx="9"/><path d="M26 22h44M38 10h20"/><path d="M42 48l18 11-18 11z" fill="#fff"/></svg>',
  fav: '<svg viewBox="0 0 96 96" width="150" height="150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M48 82C20 62 10 48 10 34a20 20 0 0 1 38-8 20 20 0 0 1 38 8c0 14-10 28-38 48z" fill="rgba(255,255,255,.18)"/></svg>'
};
var TILES = [
  { k: 'live', t: 'hubLive', g: 'linear-gradient(150deg,#12c2b0,#2563eb)' },
  { k: 'movie', t: 'hubMovies', g: 'linear-gradient(150deg,#8a6bff,#e0409a)' },
  { k: 'series', t: 'hubSeries', g: 'linear-gradient(150deg,#ff9f43,#e5484d)' },
  { k: 'fav', t: 'hubFavs', g: 'linear-gradient(150deg,#ff5d8f,#a3185a)' }
];
function openHub() {
  Player.stop(); T.stageMsg(null); Player.onTime = null; S.playing = null; S.hubOpened = true;
  go('hub'); renderHub(); prefetch();
}
function renderHub(pref) {
  T.applyLang();
  var s = $('#s-hub'), h = '', hist = Hist.all().slice(0, 5);
  h += '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="hubacc">' + esc(S.acc.name) + '</div><div class="hubclock" id="hclock">' + clockTxt() + '</div>';
  h += '<div class="hubhello">' + esc(t('hello')) + '</div><div class="tiles">';
  TILES.forEach(function (x) {
    h += '<div class="tile f" data-act="' + x.k + '"><div class="tbg" style="background:' + x.g + '"></div><div class="tic">' + ICONS[x.k] + '</div><div class="tn">' + esc(t(x.t)) + '</div><div class="cnt" id="cnt-' + x.k + '"></div></div>';
  });
  h += '</div>';
  if (hist.length) {
    h += '<div class="contT">' + esc(t('continueW')) + '</div><div class="cont">';
    hist.forEach(function (e) {
      var pg = e.d ? Math.min(100, Math.round(e.t / e.d * 100)) : 0;
      h += '<div class="cc f" data-act="resume" data-key="' + esc(e.key) + '"><div class="ccimg"><span class="ini">' + esc(e.name.charAt(0)) + '</span>' + (e.poster ? '<img src="' + esc(e.poster) + '" onerror="this.parentNode.removeChild(this)">' : '') +
        '</div><div class="ccn">' + esc(e.name) + (e.ep ? '<i>' + esc(t('sNum') + e.ep.season + ' ' + t('eNum') + e.ep.num) + '</i>' : '') + '</div><div class="pg"><u style="width:' + pg + '%"></u></div></div>';
    });
    h += '</div>';
  }
  h += '<div class="hubfoot"><div class="chip2 f" data-act="settings">⚙ ' + esc(t('settingsT')) + '</div><div class="chip2 f" data-act="accounts">⇄ ' + esc(t('switchAcc')) + '</div></div>';
  h += T.hintBar([['', 'OK', t('open')], ['', '⟲', t('back')]]);
  s.innerHTML = h;
  Nav.init(s, pref || '.tile[data-act="live"]');
  updateCounts();
  clearTimeout(renderHub.t); renderHub.t = setTimeout(function () { var c = $('#hclock'); if (c && S.screen === 'hub') c.textContent = clockTxt(); }, 30000);
}
function updateCounts() {
  if (S.screen !== 'hub') return;
  var c;
  c = $('#cnt-live'); if (c) c.textContent = S.liveLoaded ? S.channels.length + ' ' + t('chWord') : '';
  ['movie', 'series'].forEach(function (k) {
    var d = S.data && S.data[k], e = $('#cnt-' + k); if (!e) return;
    e.textContent = d && d.ready ? (d.lazy ? d.cats.length + ' ' + t('catWord') : d.items.length + ' ' + t(k === 'movie' ? 'movWord' : 'serWord')) : '';
  });
  c = $('#cnt-fav'); if (c) { var n = Fav.count(); c.textContent = n ? n + ' ' + t('itemsWord') : ''; }
}
function prefetch() {
  var acc = S.acc;
  T.loadLive().catch(noop).then(function () { if (S.acc !== acc) return; updateCounts(); return loadKind('movie').catch(noop); })
    .then(function () { if (S.acc !== acc) return; return loadKind('series').catch(noop); }).then(function () { if (S.acc === acc) updateCounts(); });
}
function hubKey(k) {
  if (k === 'back') { T.showAccounts(S.acc && S.acc.id); return; }
  if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { Nav.move(k); return; }
  if (k !== 'ok' || !Nav.cur) return;
  var a = Nav.cur.getAttribute('data-act');
  if (a === 'live') T.enterLive();
  else if (a === 'movie' || a === 'series' || a === 'fav') openRows(a);
  else if (a === 'settings') openSettings();
  else if (a === 'accounts') T.showAccounts(S.acc.id);
  else if (a === 'resume') { var e = Hist.find(Nav.cur.getAttribute('data-key')); if (e) resumeEntry(e); }
}

/* ======================================================================
 * ROWS (movies / series / favorites) — Netflix style
 * ==================================================================== */
var R = { kind: '', rows: [], base: null, r: 0, c: 0, sy: 0, sx: {}, zone: 'rows', nodes: {}, tok: 0 };
var CW = 224, RH = 420, VH = 900, VW = 1800;

function openRows(kind) {
  R.kind = kind; R.r = 0; R.c = 0; R.sy = 0; R.sx = {}; R.zone = 'rows'; R.nodes = {}; R.rows = []; R.base = null; var tok = ++R.tok;
  go('rows');
  var s = $('#s-rows');
  s.innerHTML = '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="rtitle">' + esc(t(kind === 'movie' ? 'hubMovies' : kind === 'series' ? 'hubSeries' : 'hubFavs')) + '</div>' +
    (kind === 'fav' ? '' : '<div class="rsearch"><div class="search f" id="rsb"><span class="ic">🔍</span><input id="rq" type="text" autocomplete="off" placeholder="' + esc(t('searchPh')) + '"></div></div>') +
    '<div id="rowsBox"></div><div id="rowsMsg"></div>' +
    T.hintBar([['', 'OK', t('hintRows')], ['r', '●', t('fav')], ['g', '●', t('search')], ['', '⟲', t('back')]]);
  var rq = $('#rq'); if (rq) rq.addEventListener('input', function () { clearTimeout(rq.t); rq.t = setTimeout(function () { runSearch(rq.value); }, 300); });
  if (kind === 'fav') { buildFavRows(); return; }
  var d = S.data && S.data[kind];
  if (d && d.ready) { R.rows = buildRows(kind, d); finishRows(); return; }
  rowsMsg('load', t(kind === 'movie' ? 'loadingMovies' : 'loadingSeries'));
  loadKind(kind).then(function (dd) { if (tok !== R.tok || S.screen !== 'rows') return; rowsMsg(null); R.rows = buildRows(kind, dd); finishRows(); })
    .catch(function (e) { if (tok === R.tok) rowsMsg('err', T.errText(e)); });
}
function rowsMsg(kind, text) {
  var m = $('#rowsMsg'); if (!m) return;
  m.className = kind || ''; m.innerHTML = kind ? (kind === 'load' ? '<div class="sp"></div>' : '') + '<div>' + esc(text) + '</div>' : '';
}
function buildRows(kind, d) {
  var rows = [], hist = Hist.rowItems(kind), favs = Fav.items(kind);
  if (hist.length) rows.push({ id: 'cont', title: t('continueW'), items: hist });
  if (favs.length) rows.push({ id: 'fav', title: t('hubFavs'), items: favs });
  if (d.lazy) { d.cats.forEach(function (c) { rows.push({ id: 'c' + c.id, title: c.title, items: [], total: -1, page: 0, loader: true, cat: c.id }); }); return rows; }
  var recent = d.items.slice().sort(function (a, b) { return b.added - a.added; }).slice(0, 40);
  if (recent.length) rows.push({ id: 'new', title: t('added'), items: recent });
  var by = {}; d.items.forEach(function (x) { (by[x.cat] = by[x.cat] || []).push(x); });
  d.cats.forEach(function (c) { if (by[c.id]) rows.push({ id: 'c' + c.id, title: c.title, items: by[c.id] }); });
  return rows;
}
function buildFavRows() {
  var rows = [], chans = [];
  if (S.liveLoaded) S.channels.forEach(function (c) { if (S.favs[c.id]) chans.push({ kind: 'channel', id: c.id, name: c.name, poster: c.logo, ch: c }); });
  else if (Object.keys(S.favs).length) { rowsMsg('load', t('loadingCh')); T.loadLive().then(function () { if (S.screen === 'rows' && R.kind === 'fav') { rowsMsg(null); buildFavRows(); } }).catch(function () { rowsMsg(null); }); }
  if (chans.length) rows.push({ id: 'ch', title: t('hubLive'), items: chans });
  var m = Fav.items('movie'), sr = Fav.items('series');
  if (m.length) rows.push({ id: 'm', title: t('hubMovies'), items: m });
  if (sr.length) rows.push({ id: 's', title: t('hubSeries'), items: sr });
  R.rows = rows; R.nodes = {}; var box = $('#rowsBox'); if (box) box.innerHTML = '';
  if (R.r >= rows.length) R.r = Math.max(0, rows.length - 1);
  finishRows(); if (!rows.length && !$('#rowsMsg').innerHTML) rowsMsg('idle', t('empty'));
}
function finishRows() { R.r = Math.max(0, Math.min(R.r, R.rows.length - 1)); clampCol(); R.render(); if (!R.rows.length) rowsMsg('idle', t('empty')); }
function clampCol() { var row = R.rows[R.r]; if (!row) { R.c = 0; return; } R.c = Math.max(0, Math.min(R.c, Math.max(0, row.items.length - 1))); }
function isFavItem(it) { return Fav.has(it); }

function thumb(u) { return String(u || '').replace(/\/t\/p\/(?:original|w\d{3,4}(?:_and_h\d+_[a-z0-9]+)?)\//i, '/t/p/w342/'); }
function cardNode(it) {
  var n = el('div', 'pcw'), ch = it.kind === 'channel', r = Number(it.rating);
  n.innerHTML = '<div class="pc' + (ch ? ' chn' : '') + '"><div class="img"><span class="ini">' + esc(it.name.charAt(0)) + '</span>' + (it.poster ? '<img decoding="async" src="' + esc(thumb(it.poster)) + '" onerror="this.parentNode.removeChild(this)">' : '') + '</div>' +
    (r > 0 ? '<span class="rt">★ ' + esc(r.toFixed(1)) + '</span>' : '') + (Fav.has(it) ? '<span class="hf">♥</span>' : '') +
    (it.cont && it.pos ? '<div class="pg"><u style="width:' + Math.round(it.pos * 100) + '%"></u></div>' : '') + '</div><div class="pn">' + esc(it.name) + '</div>';
  return n;
}
function layoutRow(i, nd) {
  var row = R.rows[i], items = row.items, sx = R.sx[i] || 0, n = items.length, c, a, b;
  if (i === R.r) { var cl = R.c * CW; if (cl < sx) sx = cl; else if (cl + CW > sx + VW) sx = cl + CW - VW; if (sx < 0) sx = 0; R.sx[i] = sx; }
  a = Math.max(0, Math.floor(sx / CW) - 1); b = Math.min(n - 1, Math.ceil((sx + VW) / CW) + 1);
  Object.keys(nd.cards).forEach(function (k) { var cc = Number(k); if (cc < a || cc > b) { nd.tk.removeChild(nd.cards[k]); delete nd.cards[k]; } });
  for (c = a; c <= b; c++) {
    var cn = nd.cards[c];
    if (!cn) { cn = cardNode(items[c]); cn.style[rtl() ? 'right' : 'left'] = '0'; nd.tk.appendChild(cn); nd.cards[c] = cn; }
    var x = c * CW - sx, tf = 'translate3d(' + (rtl() ? -x : x) + 'px,0,0)';
    if (cn.__t !== tf) { cn.__t = tf; cn.style.transform = tf; }
    var fc = R.zone === 'rows' && i === R.r && c === R.c; if (cn.__f !== fc) { cn.__f = fc; cn.classList.toggle('focus', fc); }
  }
  nd.sk.style.display = (!n && row.loader && row.total < 0) ? 'block' : 'none';
}
R.render = function () {
  var box = $('#rowsBox'); if (!box) return;
  var top = R.r * RH; if (top < R.sy) R.sy = top; else if (top + RH > R.sy + VH) R.sy = top + RH - VH; if (R.sy < 0) R.sy = 0;
  var first = Math.floor(R.sy / RH), last = Math.min(R.rows.length - 1, first + Math.ceil(VH / RH)), i;
  Object.keys(R.nodes).forEach(function (k) { var kk = Number(k); if (kk < first || kk > last) { box.removeChild(R.nodes[k].el); delete R.nodes[k]; } });
  for (i = first; i <= last; i++) {
    var nd = R.nodes[i];
    if (!nd) {
      nd = { el: el('div', 'rw'), cards: {} }; nd.el.innerHTML = '<div class="rt2"></div><div class="tk"></div><div class="skrow"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      nd.tk = nd.el.childNodes[1]; nd.sk = nd.el.childNodes[2]; nd.el.firstChild.textContent = R.rows[i].title; box.appendChild(nd.el); R.nodes[i] = nd;
    }
    var rtf = 'translate3d(0,' + (i * RH - R.sy) + 'px,0)'; if (nd.__t !== rtf) { nd.__t = rtf; nd.el.style.transform = rtf; }
    layoutRow(i, nd);
    var row = R.rows[i]; if (row.loader && !row.loading && row.total < 0) loadRowPage(row);
  }
  var sb = $('#rsb'); if (sb) sb.classList.toggle('focus', R.zone === 'search');
};
function loadRowPage(row) {
  if (row.loading || (row.total >= 0 && row.items.length >= row.total)) return;
  row.loading = true; row.page++; var tok = R.tok;
  S.portal.vodPage(R.kind, row.cat, row.page).then(function (r) {
    row.loading = false; row.items = row.items.concat(r.items); row.total = r.total || row.items.length; if (!r.items.length) row.total = row.items.length;
    if (tok === R.tok && S.screen === 'rows') { clampCol(); R.render(); }
  }).catch(function () { row.loading = false; row.total = row.items.length; });
}
function runSearch(q) {
  q = String(q || '').replace(/^\s+|\s+$/g, ''); var tok = ++R.tok;
  if (!q) { if (R.base) { R.rows = R.base; R.base = null; } rowsReset(); R.r = 0; R.c = 0; R.sy = 0; finishRows(); return; }
  if (!R.base) R.base = R.rows;
  function show(items) { if (tok !== R.tok) return; R.rows = [{ id: 'q', title: t('results') + ' (' + items.length + ')', items: items }]; rowsReset(); R.r = 0; R.c = 0; R.sy = 0; finishRows(); }
  var d = S.data[R.kind];
  if (!d.lazy) { var ql = q.toLowerCase(); show(d.items.filter(function (x) { return x.name.toLowerCase().indexOf(ql) >= 0; }).slice(0, 400)); }
  else S.portal.vodPage(R.kind, '', 1, q).then(function (r) { show(r.items); }).catch(function () { show([]); });
}
function rowsReset() { var box = $('#rowsBox'); if (box) box.innerHTML = ''; R.nodes = {}; R.sx = {}; }
function curItem() { var row = R.rows[R.r]; return row ? row.items[R.c] : null; }
function rowsKey(k) {
  if (k === 'back') { if ($('#rq') && $('#rq').value) { $('#rq').value = ''; runSearch(''); return; } openHub(); return; }
  if (R.zone === 'search') {
    if (k === 'down') { R.zone = 'rows'; R.render(); } else if (k === 'ok') { $('#rq').focus(); }
    return;
  }
  var it = curItem();
  if (k === 'up') { if (R.r > 0) { R.r--; clampCol(); R.render(); } else if ($('#rq')) { R.zone = 'search'; R.render(); } }
  else if (k === 'down') { if (R.r < R.rows.length - 1) { R.r++; clampCol(); R.render(); prefetchInfo(); } }
  else if (k === 'left' || k === 'right') {
    var row = R.rows[R.r]; if (!row) return; R.c = Math.max(0, Math.min(R.c + btnStep(k), row.items.length - 1));
    if (row.loader && R.c >= row.items.length - 8) loadRowPage(row);
    R.render(); prefetchInfo();
  }
  else if (k === 'green') { if ($('#rq')) { R.zone = 'search'; R.render(); } }
  else if (k === 'red') {
    if (!it) return; var on = Fav.toggle(it); toast((on ? '♥ ' : '♡ ') + it.name, 1400);
    if (R.kind === 'fav') { buildFavRows(); } else { var nd = R.nodes[R.r]; if (nd && nd.cards[R.c]) { nd.tk.removeChild(nd.cards[R.c]); delete nd.cards[R.c]; } R.render(); }
  }
  else if (k === 'ok') {
    if (!it) return;
    if (it.kind === 'channel') { S.pendingCh = it.id; T.enterLive(); }
    else openDetail(it, { from: 'rows' });
  }
}

/* ======================================================================
 * DETAIL (movie / series)
 * ==================================================================== */
var Dt = { it: null, info: {}, seasons: [], si: 0, ei: 0, zone: 'btns', bi: 0, sy: 0, tok: 0, auto: null };
function itemKey(it) { return (it.kind === 'series' ? 's:' : 'm:') + it.id; }
var INFO = {};
function infoCached(it) { var k = itemKey(it); if (!INFO[k]) { INFO[k] = (it.kind === 'series' ? S.portal.seriesInfo(it) : S.portal.vodInfo(it)); INFO[k].catch(function () { delete INFO[k]; }); } return INFO[k]; }
function prefetchInfo() { clearTimeout(prefetchInfo.t); prefetchInfo.t = setTimeout(function () { var it = S.screen === 'rows' && curItem(); if (it && (it.kind === 'movie' || it.kind === 'series')) { try { infoCached(it); } catch (e) {} } }, 220); }
function openDetail(it, opts) {
  opts = opts || {};
  Dt.it = it; Dt.info = {}; Dt.seasons = []; Dt.si = 0; Dt.ei = 0; Dt.zone = 'btns'; Dt.bi = 0; Dt.sy = 0; Dt.auto = opts.auto || null; Dt.from = opts.from || 'hub'; var tok = ++Dt.tok;
  if (it.kind === 'movie' && Dt.auto) { playMovie(it, Dt.auto.ms); return; }
  go('detail'); renderDetail();
  var pr = infoCached(it);
  pr.then(function (info) {
    if (tok !== Dt.tok) return;
    Dt.info = info || {}; Dt.seasons = Dt.info.seasons || [];
    if (it.kind === 'series') {
      var h = Hist.find(itemKey(it)), want = (Dt.auto && Dt.auto.epId) || (h && h.ep && h.ep.id);
      if (want) Dt.seasons.forEach(function (se, si) { se.eps.forEach(function (e, ei) { if (e.id === want) { Dt.si = si; Dt.ei = ei; } }); });
      if (Dt.auto) { var se = Dt.seasons[Dt.si], ep = se && se.eps[Dt.ei]; if (ep) { playEpisode(Dt.si, Dt.ei, Dt.auto.ms); return; } }
    }
    renderDetail();
  });
}
function resumeEntry(e) {
  var it = { kind: e.kind, id: e.id, name: e.name, poster: e.poster, cmd: e.cmd, ext: e.ext, eps: e.eps || [] };
  openDetail(it, { from: 'hub', auto: { ms: e.t, epId: e.ep && e.ep.id } });
}
function detailButtons() {
  var it = Dt.it, b = [], h = it.kind === 'series' ? null : Hist.find(itemKey(it)), p;
  if (it.kind === 'movie') {
    p = Pos.get('m:' + it.id);
    if (p && p.d && p.t > 5000 && p.t / p.d < 0.95) { b.push({ a: 'resume', l: '▶ ' + t('resume') + ' ' + fmtMs(p.t) }); b.push({ a: 'play', l: '↺ ' + t('restart') }); }
    else b.push({ a: 'play', l: '▶ ' + t('play') });
  } else {
    var se = Dt.seasons[Dt.si], ep = se && se.eps[Dt.ei];
    if (ep) { p = Pos.get('e:' + ep.id); var has = p && p.d && p.t > 5000 && p.t / p.d < 0.95; b.push({ a: 'playep', l: '▶ ' + (has ? t('resume') + ' ' : '') + t('sNum') + se.n + ' ' + t('eNum') + (ep.num || (Dt.ei + 1)) }); }
  }
  b.push({ a: 'fav', l: Fav.has(it) ? '♥ ' + t('inFav') : '♡ ' + t('addFav') });
  return b;
}
function renderDetail() {
  var it = Dt.it, inf = Dt.info || {}, s = $('#s-detail');
  var back = inf.backdrop || it.backdrop || it.poster || inf.poster, poster = it.poster || inf.poster || '';
  var meta = [], rt = Number(inf.rating || it.rating); if (inf.year || it.year) meta.push(inf.year || it.year); if (rt > 0) meta.push('★ ' + rt.toFixed(1)); if (it.kind === 'movie' && inf.dur) meta.push(String(inf.dur).replace(/^0+:?/, ''));
  if (inf.genre || it.genre) meta.push(inf.genre || it.genre);
  var btns = detailButtons();
  var h = '<div class="dback">' + (back ? '<img src="' + esc(back) + '" onerror="this.parentNode.removeChild(this)">' : '') + '</div><div class="dshade"></div>';
  h += '<div class="dposter"><span class="ini">' + esc(it.name.charAt(0)) + '</span>' + (poster ? '<img src="' + esc(poster) + '" onerror="this.parentNode.removeChild(this)">' : '') + '</div>';
  h += '<div class="dinfo"><h1>' + esc(it.name) + '</h1><div class="dmeta">' + meta.map(esc).join('  ·  ') + '</div><div class="dplot">' + esc(inf.plot || it.plot || '') + '</div>';
  if (inf.cast || it.cast) h += '<div class="dcast"><b>' + esc(t('cast')) + ':</b> ' + esc(String(inf.cast || it.cast).slice(0, 160)) + '</div>';
  if (inf.director || it.director) h += '<div class="dcast"><b>' + esc(t('director')) + ':</b> ' + esc(inf.director || it.director) + '</div>';
  h += '<div class="dbtns">' + btns.map(function (x, i) { return '<div class="dbtn' + (i === 0 ? ' pri' : '') + '" data-i="' + i + '">' + esc(x.l) + '</div>'; }).join('') + '</div></div>';
  if (it.kind === 'series' && Dt.seasons.length) {
    h += '<div class="dseas">' + Dt.seasons.map(function (se, i) { return '<div class="schip" data-i="' + i + '">' + esc(t('season') + ' ' + se.n) + '</div>'; }).join('') + '</div>';
    h += '<div class="deps"><div class="dsc">' + (Dt.seasons[Dt.si] ? Dt.seasons[Dt.si].eps.map(function (e, i) { return epRow(e, i); }).join('') : '') + '</div></div>';
  }
  h += T.hintBar([['', 'OK', t('play')], ['r', '●', t('fav')], ['', '⟲', t('back')]]);
  s.innerHTML = h; s.__btns = btns; paintDetail();
}
function epRow(e, i) {
  var p = Pos.get('e:' + e.id), pct = p && p.d ? Math.min(100, Math.round(p.t / p.d * 100)) : 0, done = pct >= 95;
  return '<div class="ep" data-i="' + i + '"><div class="epimg">' + (e.img ? '<img decoding="async" src="' + esc(e.img) + '" onerror="this.parentNode.removeChild(this)">' : '') + '<span>' + (e.num || i + 1) + '</span></div>' +
    '<div class="eptx"><b>' + esc(t('episode') + ' ' + (e.num || i + 1) + (e.title ? ' · ' + e.title : '')) + '</b><i>' + esc(e.dur ? String(e.dur) : '') + (done ? '  ✓ ' + t('watched') : '') + '</i></div>' + (pct && !done ? '<div class="pg"><u style="width:' + pct + '%"></u></div>' : '') + '</div>';
}
function paintDetail() {
  var s = $('#s-detail'), i;
  [].slice.call(s.querySelectorAll('.dbtn')).forEach(function (n, k) { n.classList.toggle('focus', Dt.zone === 'btns' && k === Dt.bi); });
  [].slice.call(s.querySelectorAll('.schip')).forEach(function (n, k) { n.classList.toggle('on', k === Dt.si); n.classList.toggle('focus', Dt.zone === 'seas' && k === Dt.si); });
  var eps = [].slice.call(s.querySelectorAll('.ep'));
  eps.forEach(function (n, k) { n.classList.toggle('focus', Dt.zone === 'eps' && k === Dt.ei); n.classList.toggle('cur', k === Dt.ei); });
  var sc = s.querySelector('.dsc');
  if (sc) { var top = Dt.ei * 108, vh = 372; if (top < Dt.sy) Dt.sy = top; else if (top + 100 > Dt.sy + vh) Dt.sy = top + 100 - vh; if (Dt.sy < 0) Dt.sy = 0; sc.style.transform = 'translateY(' + (-Dt.sy) + 'px)'; }
}
function detailKey(k) {
  var it = Dt.it, btns = $('#s-detail').__btns || [];
  if (k === 'back') { backFromDetail(); return; }
  if (k === 'red') { var on = Fav.toggle(it); toast((on ? '♥ ' : '♡ ') + it.name, 1400); renderDetail(); return; }
  var isS = it.kind === 'series' && Dt.seasons.length;
  if (Dt.zone === 'btns') {
    if (k === 'left' || k === 'right') { Dt.bi = Math.max(0, Math.min(Dt.bi + btnStep(k), btns.length - 1)); paintDetail(); }
    else if (k === 'down' && isS) { Dt.zone = 'seas'; paintDetail(); }
    else if (k === 'ok') {
      var a = btns[Dt.bi] && btns[Dt.bi].a;
      if (a === 'fav') { var on2 = Fav.toggle(it); toast((on2 ? '♥ ' : '♡ ') + it.name, 1400); renderDetail(); }
      else if (a === 'play') playMovie(it, 0);
      else if (a === 'resume') { var p = Pos.get('m:' + it.id); playMovie(it, p ? p.t : 0); }
      else if (a === 'playep') { var se = Dt.seasons[Dt.si], ep = se && se.eps[Dt.ei], pp = ep && Pos.get('e:' + ep.id); playEpisode(Dt.si, Dt.ei, pp && pp.d && pp.t / pp.d < 0.95 ? pp.t : 0); }
    }
  } else if (Dt.zone === 'seas') {
    if (k === 'up') { Dt.zone = 'btns'; paintDetail(); }
    else if (k === 'down') { if (Dt.seasons[Dt.si] && Dt.seasons[Dt.si].eps.length) { Dt.zone = 'eps'; paintDetail(); } }
    else if (k === 'left' || k === 'right') { var ni = Math.max(0, Math.min(Dt.si + btnStep(k), Dt.seasons.length - 1)); if (ni !== Dt.si) { Dt.si = ni; Dt.ei = 0; Dt.sy = 0; renderDetail(); Dt.zone = 'seas'; paintDetail(); } }
  } else if (Dt.zone === 'eps') {
    var n = Dt.seasons[Dt.si].eps.length;
    if (k === 'up') { if (Dt.ei > 0) { Dt.ei--; paintDetail(); } else { Dt.zone = 'seas'; paintDetail(); } }
    else if (k === 'down') { if (Dt.ei < n - 1) { Dt.ei++; paintDetail(); } }
    else if (k === 'ok') { var e = Dt.seasons[Dt.si].eps[Dt.ei], q = Pos.get('e:' + e.id); playEpisode(Dt.si, Dt.ei, q && q.d && q.t / q.d < 0.95 ? q.t : 0); }
  }
}
function backFromDetail() { Dt.tok++; if (Dt.from === 'rows' && R.rows.length) { go('rows'); R.render(); } else openHub(); }

/* ======================================================================
 * VOD player
 * ==================================================================== */
var V = { ctx: null, osdT: null, seekAcc: 0, seekT: null, lastSave: 0, paused: false, tok: 0, dur: 0 };
function playMovie(it, ms) {
  var ext = it.ext || (Dt.info && Dt.info.ext) || 'mp4';
  startVod({ kind: 'movie', item: it, meta: { kind: 'movie', id: it.id, ext: ext, cmd: it.cmd }, key: 'm:' + it.id, title: it.name, sub: '' }, ms);
}
function playEpisode(si, ei, ms) {
  var it = Dt.it, se = Dt.seasons[si], ep = se && se.eps[ei]; if (!ep) return;
  Dt.si = si; Dt.ei = ei;
  startVod({ kind: 'episode', item: it, si: si, ei: ei, ep: ep, season: se.n, meta: { kind: 'episode', id: ep.id, ext: ep.ext, cmd: it.cmd, ser: ep.ser }, key: 'e:' + ep.id,
    title: it.name, sub: t('season') + ' ' + se.n + ' · ' + t('episode') + ' ' + (ep.num || ei + 1) + (ep.title ? ' · ' + ep.title : '') }, ms);
}
function startVod(ctx, ms) {
  var tok = ++V.tok; V.ctx = ctx; V.info = null; V.dur = 0; V.paused = false; V.seekAcc = 0; V.lastSave = 0; T.Subs.reset();
  if (!Prefs.resume) ms = 0;
  go('vod'); renderVod(); T.stageMsg('load', t('tuning')); showVodOsd(true);
  if (!vodMeta().plot) { var it0 = ctx.item; (it0.kind === 'series' ? S.portal.seriesInfo(it0) : S.portal.vodInfo(it0)).then(function (inf) { if (tok !== V.tok || !inf) return; V.info = inf; refreshVodMeta(); }).catch(function () {}); }
  S.portal.vodLink(ctx.meta).then(function (url) {
    if (tok !== V.tok) return;
    Player.play(url, {
      onState: function (st) { if (tok !== V.tok) return; if (st === 'buffering') T.stageMsg('load', t('buffering')); else if (st === 'playing') { T.stageMsg(null); showVodOsd(); } },
      onError: function () { if (tok !== V.tok) return; T.stageMsg('err', t('playErr') + '\n' + t('retryHint')); showVodOsd(true); },
      onEnd: function () { if (tok === V.tok) vodEnded(); },
      onReady: function () { if (tok !== V.tok) return; V.dur = Player.dur; updateVodBar(Player.ms); var tt = $('#vtot'); if (tt) tt.textContent = fmtMs(V.dur); T.Subs.ready(); Quality.load(Player.master || Player.url).then(function () { if (tok === V.tok) refreshVq(); }); }
    }, { startMs: ms || 0, onTime: function (m) { if (tok === V.tok) onVodTime(m); }, onSub: function (txt, d) { if (tok === V.tok) T.Subs.cue(txt, d); } });
  });
}
/* metadata shown in the infobar: plot, year, rating, genre (loaded on demand when resuming straight from the hub) */
function vodMeta() {
  var c = V.ctx, it = c.item, inf = V.info || (Dt.it && Dt.it.id === it.id && Dt.info) || {}, ep = c.ep || {};
  return { plot: ep.plot || inf.plot || it.plot || '', year: inf.year || it.year || '', rating: inf.rating || it.rating || '', genre: inf.genre || '', dur: inf.dur || '', poster: it.poster || inf.poster || '' };
}
function vodMetaHtml() {
  var m = vodMeta(), h = '', r = parseFloat(m.rating);
  if (m.year) h += '<span class="vc">' + esc(m.year) + '</span>';
  if (r > 0) h += '<span class="vc star">★ ' + (r > 10 ? r : r.toFixed(1)) + '</span>';
  if (m.genre) h += '<span class="vg">' + esc(String(m.genre).split(/[,\/|]/)[0].replace(/^\s+|\s+$/g, '')) + '</span>';
  return { chips: h, plot: m.plot ? String(m.plot).replace(/<[^>]*>/g, '') : '' };
}
function renderVod() {
  var c = V.ctx, s = $('#s-vod'), m = vodMeta(), mh = vodMetaHtml(), d = new Date();
  s.innerHTML = '<div class="vcen" id="vcen">❚❚</div><div class="vp">' +
    '<div class="vp-ps"><span class="li">' + esc(c.title.charAt(0)) + '</span>' + (m.poster ? '<img decoding="async" src="' + esc(m.poster) + '" onerror="this.parentNode.removeChild(this)">' : '') + '</div>' +
    '<div class="vp-main"><div class="vp-t">' + esc(c.title) + '</div>' + (c.sub ? '<div class="vp-sub">' + esc(c.sub) + '</div>' : '') +
    '<div class="vp-meta" id="vmeta">' + mh.chips + '</div><div class="vp-plot" id="vplot">' + esc(mh.plot) + '</div>' +
    '<div class="vbar"><u id="vfill"></u><i id="vknob"></i></div>' +
    '<div class="vtimes"><span id="vcur">0:00</span><span class="vrem" id="vrem"></span><span id="vtot">0:00</span></div></div>' +
    '<div class="ib-side"><div class="ib-clock" id="vclk">' + T.clock2() + '</div><div class="ib-date">' + esc(T.dateTxt()) + '</div><div id="vq">' + T.qHtml(true) + '</div></div></div>' +
    '<div class="vhint"><span><b class="k">◀ ▶</b>' + esc(t('hintSeek')) + '</span><span><b class="k">OK</b>' + esc(t('hintPause')) + '</span><span><b class="k">▲</b>' + esc(t('hintMenu')) + '</span>' +
    (c.kind === 'episode' ? '<span><b class="k">CH</b>' + esc(t('nextEp')) + '</span>' : '') + '</div>';
}
/* refresh pieces that arrive late (movie info, HLS variant list) without rebuilding the bar */
function refreshVodMeta() {
  var mh = vodMetaHtml(), a = $('#vmeta'), b = $('#vplot'); if (a) a.innerHTML = mh.chips; if (b) b.textContent = mh.plot;
}
function refreshVq() { var e = $('#vq'); if (e) e.innerHTML = T.qHtml(true); }
function showVodOsd(keep) {
  var s = $('#s-vod'); s.classList.add('show'); clearTimeout(V.osdT);
  var k = $('#vclk'); if (k) k.textContent = T.clock2();
  if (!keep && !V.paused) V.osdT = setTimeout(function () { s.classList.remove('show'); }, 5200);
}
function updateVodBar(ms) {
  var f = $('#vfill'), kn = $('#vknob'), c = $('#vcur'); if (!f) return;
  var pct = V.dur ? Math.max(0, Math.min(100, ms / V.dur * 100)) : 0;
  f.style.width = pct + '%'; kn.style[rtl() ? 'right' : 'left'] = pct + '%'; if (c) c.textContent = fmtMs(ms);
  var r = $('#vrem'); if (r) { if (V.dur) { var end = new Date(Date.now() + (V.dur - ms)); r.textContent = t('remain') + ' ' + fmtMs(V.dur - ms) + '  ·  ' + t('endsAt') + ' ' + ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2); } else r.textContent = ''; }
}
function onVodTime(ms) {
  if (!V.dur && Player.dur) { V.dur = Player.dur; var tt = $('#vtot'); if (tt) tt.textContent = fmtMs(V.dur); }
  if (!V.seekAcc) updateVodBar(ms);
  var now = Date.now(); if (now - V.lastSave > 10000 && ms > 3000) { V.lastSave = now; saveProgress(ms); }
}
function saveProgress(ms) {
  var c = V.ctx; if (!c || !V.dur) return;
  Pos.set(c.key, ms, V.dur);
  var it = c.item, e = { key: itemKey(it), kind: it.kind, id: it.id, name: it.name, poster: it.poster || (Dt.info && Dt.info.poster) || '', cmd: it.cmd || '', ext: it.ext || '', eps: it.eps || [], t: ms, d: V.dur, ts: Date.now() };
  if (c.kind === 'episode') e.ep = { id: c.ep.id, num: c.ep.num || c.ei + 1, season: c.season };
  Hist.save(e);
}
function vodEnded() {
  var c = V.ctx; if (!c) return;
  Pos.set(c.key, V.dur, V.dur || 1);
  if (c.kind === 'episode') {
    var se = Dt.seasons[c.si], next = se && se.eps[c.ei + 1] ? [c.si, c.ei + 1] : (Dt.seasons[c.si + 1] && Dt.seasons[c.si + 1].eps.length ? [c.si + 1, 0] : null);
    if (next && Prefs.autonext) { toast(t('playingNext'), 1800); var tk = V.tok; setTimeout(function () { if (tk === V.tok) playEpisode(next[0], next[1], 0); }, 900); return; }
  }
  Hist.remove(itemKey(c.item));
  exitVod();
}
function exitVod() {
  var c = V.ctx, ms = Player.ms; V.tok++; clearTimeout(V.seekT); V.seekAcc = 0;
  if (c && V.dur && ms > 3000 && ms / V.dur < 0.95) saveProgress(ms); else if (c && V.dur && ms / V.dur >= 0.95) { Pos.set(c.key, V.dur, V.dur); Hist.remove(itemKey(c.item)); }
  Player.stop(); T.Subs.stop(); T.stageMsg(null); V.ctx = null;
  if (Dt.it && S.screen === 'vod') { go('detail'); renderDetail(); } else openHub();
}
function vodKey(k) {
  var c = V.ctx; if (!c) return;
  if (k === 'back' || k === 'stop') { exitVod(); return; }
  if (k === 'ok' || k === 'playpause') { V.paused = Player.toggle(); var cen = $('#vcen'); cen.textContent = V.paused ? '❚❚' : '▶'; cen.classList.add('flash'); setTimeout(function () { cen.classList.remove('flash'); }, 700); showVodOsd(); return; }
  if (k === 'play') { Player.resume(); V.paused = false; showVodOsd(); return; }
  if (k === 'pause') { Player.pause(); V.paused = true; showVodOsd(); return; }
  if (k === 'up' || k === 'yellow' || k === 'info') { if (k === 'info') showVodOsd(); else openMenu('vod'); return; }
  if (k === 'down') { $('#s-vod').classList.remove('show'); return; }
  if (k === 'left' || k === 'right' || k === 'ff' || k === 'rw') {
    var dir = (k === 'ff') ? 1 : (k === 'rw') ? -1 : (k === 'right' ? 1 : -1);
    var step = (k === 'ff' || k === 'rw') ? 30000 : (Math.abs(V.seekAcc) >= 60000 ? 30000 : 10000);
    if (rtl() && (k === 'left' || k === 'right')) dir = -dir; // visual direction: bar fills from the right in Arabic
    V.seekAcc += dir * step; var target = Math.max(0, Math.min(Player.ms + V.seekAcc, V.dur ? V.dur - 2000 : Player.ms + V.seekAcc));
    updateVodBar(target); showVodOsd(true);
    clearTimeout(V.seekT); V.seekT = setTimeout(function () { Player.seek(target); V.seekAcc = 0; showVodOsd(); }, 550); return;
  }
  if ((k === 'chup' || k === 'chdown') && c.kind === 'episode') {
    var se = Dt.seasons[c.si], ni = c.ei + (k === 'chup' ? 1 : -1);
    if (se && se.eps[ni]) { saveProgress(Player.ms); playEpisode(c.si, ni, 0); }
  }
}

/* ======================================================================
 * player menu: quality + audio (shared by live and VOD)
 * ==================================================================== */
var Menu = T.menu;
Menu.items = []; Menu.idx = 0; Menu.mode = '';
function openMenu(mode) {
  Menu.mode = mode; Menu.open = true; Menu.vs = null; Menu.top = 0; buildMenu(); showMenu();
  Quality.load(Player.master || Player.url).then(function (vs) { if (!Menu.open) return; Menu.vs = vs; buildMenu(); showMenu(); });
}
function buildMenu() {
  var it = [], vs = Menu.vs, cur = Player.variant || '';
  it.push({ hdr: true, l: t('quality') });
  it.push({ l: t('auto'), sel: !cur, q: '' });
  if (vs && vs.length) { var seen = {}; vs.forEach(function (v) { var lb = Quality.label(v); if (seen[lb]) return; seen[lb] = 1; it.push({ l: lb, sel: cur === v.url, q: v.url }); }); }
  else if (vs) it.push({ l: t('onlyOne'), dis: true });
  it.push({ hdr: true, l: t('aspect') });
  ASPK.forEach(function (k) { it.push({ l: aspLabel(k), sel: (Prefs.aspect || 'fit') === k, asp: k }); });
  var au = Player.tracks('AUDIO');
  if (au.length > 1) { it.push({ hdr: true, l: t('audio') }); au.forEach(function (a) { it.push({ l: a.label, au: a.index }); }); }
  T.Subs.menuItems().forEach(function (x) { it.push(x); });
  if (Menu.mode === 'vod' && V.ctx && V.ctx.kind === 'episode') {
    it.push({ hdr: true, l: t('episode') }); it.push({ l: '⏭ ' + t('nextEp'), nav: 1 }); it.push({ l: '⏮ ' + t('prevEp'), nav: -1 });
  }
  Menu.items = it;
  if (Menu.idx >= it.length || it[Menu.idx].hdr || it[Menu.idx].dis) { Menu.idx = 0; stepMenu(1); }
}
function showMenu() {
  var m = $('#pmenu'); m.style.display = 'block';
  // only a window of rows is drawn (the list can hold 50+ languages); it scrolls with the focus
  var n = Menu.items.length, VIS = 9, st = Menu.top || 0;
  if (Menu.idx < st + 1) st = Math.max(0, Menu.idx - 1); else if (Menu.idx > st + VIS - 2) st = Math.min(Math.max(0, n - VIS), Menu.idx - VIS + 2);
  if (st > 0 && Menu.items[st] && !Menu.items[st].hdr) { var hh = st; while (hh > 0 && !Menu.items[hh - 1].hdr) hh--; if (hh > 0 && st - hh < 3) st = hh - 1; }
  Menu.top = st;
  m.innerHTML = '<div class="pmt">' + esc(t('menuTitle')) + '</div>' + (st > 0 ? '<div class="pmmore">▲</div>' : '<div class="pmmore">&nbsp;</div>') + Menu.items.slice(st, st + VIS).map(function (x, k) {
    var i = st + k; return x.hdr ? '<div class="pmh">' + esc(x.l) + '</div>' : '<div class="pmi' + (i === Menu.idx ? ' focus' : '') + (x.dis ? ' dis' : '') + '">' + (x.sel ? '<b>✓</b>' : '<b></b>') + '<span>' + esc(x.l) + '</span></div>';
  }).join('') + (st + VIS < n ? '<div class="pmmore">▼</div>' : '');
}
function stepMenu(d) {
  var i = Menu.idx, n = Menu.items.length, tries = 0;
  do { i += d; tries++; if (i < 0 || i >= n) return; } while ((Menu.items[i].hdr || Menu.items[i].dis) && tries < n);
  Menu.idx = i;
}
function closeMenu() { Menu.open = false; $('#pmenu').style.display = 'none'; }
Menu.key = function (k) {
  if (k === 'back' || k === 'yellow') { closeMenu(); return; }
  if (k === 'up') { stepMenu(-1); showMenu(); return; }
  if (k === 'down') { stepMenu(1); showMenu(); return; }
  if (k !== 'ok') return;
  var x = Menu.items[Menu.idx]; if (!x || x.hdr || x.dis) return;
  if (T.Subs.menuAct(x)) { closeMenu(); return; }
  if (x.asp) { Prefs.aspect = x.asp; T.savePrefs(); Player.applyAspect(); closeMenu(); toast(t('aspect') + ': ' + x.l, 1600); return; }
  if (x.q !== undefined) { closeMenu(); Player.setVariant(x.q); toast(t('changed') + ': ' + x.l, 1600); T.stageMsg('load', t('buffering')); return; }
  if (x.au !== undefined) { Player.selectTrack('AUDIO', x.au); closeMenu(); return; }
  if (x.nav) { closeMenu(); var c = V.ctx; if (c && c.kind === 'episode') { var se = Dt.seasons[c.si], ni = c.ei + x.nav; if (se && se.eps[ni]) { saveProgress(Player.ms); playEpisode(c.si, ni, 0); } } }
};

/* ======================================================================
 * SETTINGS (Netflix-style list)
 * ==================================================================== */
var QUAL = ['auto', '1080', '720', '480', '360'];
function diagVal() { var c = Store.get('crash', null); return c ? c.screen : t('diagNone'); }
function diagDesc() { var c = Store.get('crash', null), e = Store.get('lastErr', null); return (c ? t('diagScreen') + ': ' + c.screen + '. ' : '') + (e ? t('diagErr') + ': ' + e.m + ' (' + e.l + ')' : ''); }
function qLabel(q) { return q === 'auto' ? t('auto') : q + 'p'; }
var St = { sy: 0 };
var ASPK = ['fit', 'fill', 'zoom', '169', '43', '219'], ASPT = { fit: 'aspFit', fill: 'aspFill', zoom: 'aspZoom', '169': 'asp169', '43': 'asp43', '219': 'asp219' };
function aspLabel(k) { return t(ASPT[k] || 'aspFit'); }
function openSettings(pref) {
  St.pick = false; go('settings'); T.applyLang(); var s = $('#s-settings');
  function row(act, label, val, desc) { return '<div class="srow f" data-act="' + act + '" data-desc="' + esc(desc || '') + '"><span class="sl">' + esc(label) + '</span><span class="sv">' + esc(val) + '</span></div>'; }
  function onOff(v) { return v ? t('on') : t('off'); }
  var h = '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="rtitle">' + esc(t('settingsT')) + '</div><div class="sbox" id="sbox"><div class="sin">';
  h += '<div class="sh">' + esc(t('playback')) + '</div>' + row('quality', t('defQuality'), qLabel(Prefs.quality), t('qualNote')) + row('autonext', t('autoNext'), onOff(Prefs.autonext), '') +
    row('resume', t('resumePlay'), onOff(Prefs.resume), '') + row('fast', t('fastStart'), onOff(Prefs.fast), t('fastNote')) + row('aspect', t('aspect'), aspLabel(Prefs.aspect), t('aspNote')) + row('hist', t('clearHist'), '', '');
  h += '<div class="sh">' + esc(t('subsT')) + '</div>' + row('subs', t('subAuto'), onOff(Prefs.subs), t('subNote')) + row('subLang', t('subTo'), T.Subs.langName(Prefs.subLang), '') + row('subBoth', t('subBoth'), onOff(Prefs.subBoth), '') + row('subSize', t('subSize'), t(Prefs.subSize === 'xl' ? 'sizeXL' : Prefs.subSize === 'l' ? 'sizeL' : 'sizeM'), '');
  h += '<div class="sh">' + esc(t('ui')) + '</div>' + row('lang', t('lang2'), t('lang'), '') + row('perf', t('perf'), onOff(Prefs.perf), t('perfNote'));
  h += '<div class="sh">' + esc(t('conn')) + '</div>' + row('relay', t('relayRow'), '', '') + row('diag', t('diagT'), diagVal(), diagDesc());
  h += '<div class="sh">' + esc(t('accountT')) + '</div>' + row('edit', t('editAcc'), S.acc ? S.acc.name : '', '') + row('accounts', t('switchAcc'), '', '');
  h += '</div></div><div class="sdesc" id="sdesc"></div>' + T.hintBar([['', 'OK', t('open')], ['', '⟲', t('back')]]);
  s.innerHTML = h; St.sy = 0;
  Nav.init(s, pref ? '[data-act="' + pref + '"]' : null); settingsScroll();
}
function openLangPick() {
  go('settings'); St.pick = true; var s = $('#s-settings');
  var h = '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="rtitle">' + esc(t('subTo')) + '</div><div class="sbox" id="sbox"><div class="sin">';
  T.Subs.LANGS.forEach(function (x) { h += '<div class="srow f" data-lang="' + esc(x[0]) + '" data-desc=""><span class="sl">' + esc(x[1]) + '</span><span class="sv">' + (Prefs.subLang === x[0] ? '✓' : '') + '</span></div>'; });
  h += '</div></div><div class="sdesc" id="sdesc"></div>' + T.hintBar([['', 'OK', t('open')], ['', '⟲', t('back')]]);
  s.innerHTML = h; St.sy = 0; Nav.init(s, '[data-lang="' + Prefs.subLang + '"]'); settingsScroll();
}
function settingsScroll() {
  var c = Nav.cur, sin = $('#sbox') && $('#sbox').firstChild; if (!c || !sin) return;
  var top = c.offsetTop, vh = 790; if (top < St.sy + 60) St.sy = Math.max(0, top - 80); else if (top + c.offsetHeight > St.sy + vh) St.sy = top + c.offsetHeight - vh + 30;
  sin.style.transform = 'translateY(' + (-St.sy) + 'px)'; var d = $('#sdesc'); if (d) d.textContent = c.getAttribute('data-desc') || '';
}
function settingsKey(k) {
  if (St.pick) {
    if (k === 'back') { openSettings('subLang'); return; }
    if (k === 'up' || k === 'down') { Nav.move(k); settingsScroll(); return; }
    if (k === 'ok' && Nav.cur) { Prefs.subLang = Nav.cur.getAttribute('data-lang'); T.savePrefs(); openSettings('subLang'); }
    return;
  }
  if (k === 'back') { if (S.acc && S.portal) openHub(); else T.showAccounts(); return; }
  if (k === 'up' || k === 'down' || k === 'left' || k === 'right') { Nav.move(k); settingsScroll(); return; }
  if (k !== 'ok' || !Nav.cur) return;
  var a = Nav.cur.getAttribute('data-act');
  if (a === 'quality') { Prefs.quality = QUAL[(QUAL.indexOf(Prefs.quality) + 1) % QUAL.length]; T.savePrefs(); openSettings(a); }
  else if (a === 'subs' || a === 'subBoth') { Prefs[a] = !Prefs[a]; T.savePrefs(); openSettings(a); }
  else if (a === 'subLang') openLangPick();
  else if (a === 'subSize') { Prefs.subSize = Prefs.subSize === 'm' ? 'l' : Prefs.subSize === 'l' ? 'xl' : 'm'; T.savePrefs(); openSettings(a); }
  else if (a === 'aspect') { Prefs.aspect = ASPK[(ASPK.indexOf(Prefs.aspect) + 1) % ASPK.length]; T.savePrefs(); Player.applyAspect(); openSettings(a); }
  else if (a === 'perf') { Prefs.perf = !Prefs.perf; T.savePrefs(); openSettings(a); }
  else if (a === 'autonext' || a === 'resume' || a === 'fast') { Prefs[a] = !Prefs[a]; T.savePrefs(); openSettings(a); }
  else if (a === 'diag') { Store.set('crash', null); Store.set('lastErr', null); openSettings(a); }
  else if (a === 'hist') { Hist.clear(); toast(t('histCleared'), 1600); }
  else if (a === 'lang') { T.setLang(T.getLang() === 'ar' ? 'en' : 'ar'); openSettings('lang'); }
  else if (a === 'relay') T.showRelay(function () { openSettings('relay'); });
  else if (a === 'edit') T.showForm(S.acc);
  else if (a === 'accounts') T.showAccounts(S.acc.id);
}

/* ======================================================================
 * input while typing (search boxes)
 * ==================================================================== */
T.typing = function (kc, ae) {
  if (S.screen !== 'rows') return false;
  if (kc === 13 || kc === 40 || kc === 10009 || kc === 27) { ae.blur(); R.zone = (kc === 40 || kc === 13) ? 'rows' : 'search'; R.render(); return true; }
  return false;
};

T.keys.hub = hubKey; T.keys.rows = rowsKey; T.keys.detail = detailKey; T.keys.vod = vodKey; T.keys.settings = settingsKey;
T.openHub = openHub; T.openMenu = openMenu; T.openSettings = openSettings;
window.__media = { R: R, Dt: Dt, V: V, Hist: Hist, Fav: Fav, Pos: Pos, Menu: Menu };
})();
