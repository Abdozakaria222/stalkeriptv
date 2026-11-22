/* Stalker TV — subtitles from the internet (OpenSubtitles.com) for movies / episodes that carry none.
 * Arabic first (shown as it is); otherwise English, translated cue by cue like the file's own subtitles.
 * Needs the user's free API key (opensubtitles.com -> API consumers); a free account raises the daily downloads from 5 to 20.
 * A picked subtitle is kept on the device for that movie / episode, so watching it again costs no download. */
(function () {
'use strict';
var T = window.__tv, Subs = T && T.Subs; if (!Subs) return;
var t = T.t, Store = T.Store, Prefs = T.Prefs, Player = T.Player, S = T.S, toast = T.toast;

var AR = {
  osT: 'ترجمة من الإنترنت', osRow: 'ترجمة من الإنترنت (OpenSubtitles)', osOnV: 'مفعّلة', osOffV: 'غير مضبوطة',
  osRowNote: 'يجيب ترجمة عربية من OpenSubtitles للأفلام والحلقات اللي ملهاش ترجمة (ولو مفيش عربي يجيب إنجليزي ويترجمه). محتاج مفتاح API مجاني.',
  osAbout: 'لما الفيلم أو الحلقة تكون من غير ترجمة، التطبيق يدوّر على ترجمة عربية في OpenSubtitles (ولو مش موجودة يجيب الإنجليزي ويترجمه). الترجمة اللي تختارها بتتحفظ للفيلم ده.',
  osKey: 'مفتاح API', osKeyNone: 'غير مضبوط', osAcc: 'حساب OpenSubtitles (اختياري)', osAccNone: 'بدون — 5 ترجمات في اليوم', osAccNote: 'بالحساب المجاني تقدر تنزّل 20 ترجمة في اليوم بدل 5',
  osUser: 'اسم المستخدم (اختياري)', osPass: 'كلمة المرور (اختياري)', osAuto: 'بحث تلقائي لما الفيلم يكون من غير ترجمة', osAutoNote: 'بعد ثواني من بداية الفيلم، لو مفيش ترجمة، يجيب أفضل ترجمة لوحده',
  osTest: 'اختبار', osOk: 'شغال', osLeft: 'تحميلات متبقية النهارده', osHelp: 'إزاي أجيب المفتاح؟',
  osHelpNote: '1) افتح opensubtitles.com وسجّل حساب مجاني  2) من صفحة حسابك ادخل API Consumers واضغط New Consumer  3) انسخ الـ API Key واكتبه هنا (تقدر تبعته من الموبايل بالكود)',
  osFind: 'دوّر على ترجمة من الإنترنت', osFinding: 'جاري البحث عن ترجمة…', osNoRes: 'ملقيناش ترجمة للفيلم ده', osNeedKey: 'اكتب مفتاح OpenSubtitles من الإعدادات ← الترجمة',
  osLoading: 'جاري تحميل الترجمة…', osLoaded: 'ترجمة من الإنترنت', osStop: 'إيقاف ترجمة الإنترنت', osQuota: 'خلصت تحميلات النهارده — جرّب بكرة أو ضيف حساب مجاني',
  osBadKey: 'مفتاح OpenSubtitles غلط', osBadLogin: 'اسم المستخدم أو كلمة المرور غلط', osErr: 'تعذّر الوصول لـ OpenSubtitles', osBadFile: 'ملف الترجمة فاضي أو مش مفهوم',
  osMT: 'آلية', osToAr: 'تتترجم', osSaved: 'محفوظة', osRetry: 'دوّر تاني'
};
var EN = {
  osT: 'Subtitles from the internet', osRow: 'Internet subtitles (OpenSubtitles)', osOnV: 'On', osOffV: 'Not set up',
  osRowNote: 'Gets subtitles from OpenSubtitles for movies and episodes that have none (in your language, or English translated). Needs a free API key.',
  osAbout: 'When a movie or episode has no subtitles, the app looks for them on OpenSubtitles in your language (or English, translated). The one you pick is kept for that title.',
  osKey: 'API key', osKeyNone: 'Not set', osAcc: 'OpenSubtitles account (optional)', osAccNone: 'None — 5 downloads a day', osAccNote: 'With a free account you can download 20 subtitles a day instead of 5',
  osUser: 'Username (optional)', osPass: 'Password (optional)', osAuto: 'Search automatically when there are no subtitles', osAutoNote: 'A few seconds into the movie, if it has no subtitles, the best match is loaded by itself',
  osTest: 'Test', osOk: 'Working', osLeft: 'downloads left today', osHelp: 'How do I get a key?',
  osHelpNote: '1) Open opensubtitles.com and sign up for free  2) In your profile open API Consumers and press New Consumer  3) Copy the API Key and enter it here (you can send it from your phone with the code)',
  osFind: 'Search subtitles on the internet', osFinding: 'Searching for subtitles…', osNoRes: 'No subtitles found for this title', osNeedKey: 'Enter your OpenSubtitles key in Settings → Subtitles',
  osLoading: 'Loading the subtitles…', osLoaded: 'Internet subtitles', osStop: 'Turn off internet subtitles', osQuota: 'No downloads left today — try tomorrow or add a free account',
  osBadKey: 'The OpenSubtitles key is not valid', osBadLogin: 'Wrong username or password', osErr: 'Could not reach OpenSubtitles', osBadFile: 'The subtitle file is empty or not readable',
  osMT: 'machine', osToAr: 'translated', osSaved: 'saved', osRetry: 'Search again'
};
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

var UA = 'StalkerTV v3.6.0', API = 'https://api.opensubtitles.com/api/v1';
function key() { return String(Store.get('osKey', '') || '').replace(/\s+/g, ''); }
function apiBase() { var h = String(Store.get('osHost', '') || ''); return /^[a-z0-9.-]+\.opensubtitles\.(com|org)$/i.test(h) ? 'https://' + h + '/api/v1' : API; }
function err(msg, kind) { var e = new Error(msg); e.kind = kind || ''; return e; }
function pj(txt) { try { return JSON.parse(txt); } catch (e) { return null; } }

/* one request; resolves with {status, text} also for HTTP errors (the service explains them in the body) */
function req(method, url, headers, body, ms) {
  return new Promise(function (res) {
    var x = new XMLHttpRequest(), done = false;
    function fin(st, txt) { if (!done) { done = true; res({ status: st, text: txt || '' }); } }
    try { x.open(method, url, true); x.timeout = ms || 15000; } catch (e) { fin(0); return; }
    for (var k in headers) { try { x.setRequestHeader(k, headers[k]); } catch (e2) {} }
    x.onload = function () { fin(x.status, x.responseText); };
    x.onerror = function () { fin(0); }; x.ontimeout = function () { fin(-2); };
    try { x.send(body == null ? null : body); } catch (e3) { fin(0); }
  });
}
function hdr(k, json, tok) {
  var h = { 'Api-Key': k, 'Accept': 'application/json', 'User-Agent': UA, 'X-User-Agent': UA };   // browsers cannot set User-Agent: the service also reads X-User-Agent
  if (json) h['Content-Type'] = 'application/json';
  if (tok) h.Authorization = 'Bearer ' + tok;
  return h;
}
function why(r, j) {
  var m = (j && (j.message || (j.errors && j.errors.join && j.errors.join(' ')))) || '';
  if (r.status === 401 || r.status === 403) return err(/password|login|credential/i.test(m) ? t('osBadLogin') : t('osBadKey'), 'key');
  if (r.status === 406 || (r.status === 429 && /download/i.test(m))) return err(t('osQuota'), 'quota');
  if (r.status <= 0) return err(t('osErr'), 'net');
  return err(m ? m.slice(0, 120) : t('osErr') + ' (HTTP ' + r.status + ')', 'http');
}
/* optional free account: its token raises the download limit (kept ~20 h; the service may name another API host for VIP accounts) */
function login(k, user, pass, force) {
  if (!user || !pass) return Promise.resolve('');
  var tk = Store.get('osTok', null);
  if (!force && tk && tk.v && tk.u === user && Date.now() - tk.t < 20 * 3600e3) return Promise.resolve(tk.v);
  return req('POST', API + '/login', hdr(k, true), JSON.stringify({ username: user, password: pass }), 15000).then(function (r) {
    var j = pj(r.text);
    if (r.status === 200 && j && j.token) {
      Store.set('osTok', { v: j.token, u: user, t: Date.now(), dl: j.user && j.user.allowed_downloads });
      if (j.base_url && /^[a-z0-9.-]+$/i.test(j.base_url)) Store.set('osHost', j.base_url); else Store.set('osHost', '');
      return j.token;
    }
    throw why(r, j);
  });
}
function auth() { var k = key(); if (!k) return Promise.reject(err(t('osNeedKey'), 'key')); return login(k, Store.get('osUser', ''), Store.get('osPass', '')).then(function (tk) { return { k: k, tok: tk }; }); }

/* ---- what to search: TMDB id when the provider gives one, else the cleaned-up title (+ year / season / episode) ---- */
function cleanTitle(n) {
  var s = String(n || '').replace(/[\u200e\u200f\u202a-\u202e]/g, ''), y = '', i, m;
  for (i = 0; i < 4; i++) s = s.replace(/^\s*(\[[^\]]{1,14}\]|\|[^|]{1,14}\||\([A-Z0-9 ]{1,8}\)|[A-Z0-9]{2,4}\s*[:|\-–]\s+|[A-Z]{2,3}:)\s*/, '');
  m = s.match(/[\(\[]\s*((?:19|20)\d\d)\s*[\)\]]/) || s.match(/(?:^|\s|-)((?:19|20)\d\d)\s*$/);
  if (m) { y = m[1]; s = s.replace(m[0], ' '); }
  s = s.replace(/\b(4k|uhd|fhd|hd|sd|hq|hdr|2160p|1080p|720p|480p|hevc|x26[45]|h\.?26[45]|multi(?:-?sub)?|vostfr|dubbed|subbed|dual|web-?dl|webrip|bluray|brrip|cam)\b/gi, ' ');
  s = s.replace(/\bS\d{1,2}\s*E\d{1,3}\b|\bS\d{1,2}\b|\bseason\s*\d+\b|\bpart\s*\d+\b/gi, ' ').replace(/(مترجم|مدبلج|الموسم\s*\d+|الجزء\s*\d+|الحلقة\s*\d+)/g, ' ');
  s = s.replace(/[._]+/g, ' ').replace(/[\[\]\(\)|]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[\s\-–:]+|[\s\-–:]+$/g, '');
  return { q: s, year: y };
}
function seasonFromName(n) { var m = String(n || '').match(/\bS(\d{1,2})\b|season\s*(\d{1,2})|الموسم\s*(\d{1,2})/i); return m ? Number(m[1] || m[2] || m[3]) : 0; }
function langs() { var l = [osLang(Prefs.subLang || 'ar')]; if (l[0] !== 'en') l.push('en'); return l; }
function osLang(c) { c = String(c || '').toLowerCase(); return c === 'iw' ? 'he' : c === 'zh-cn' ? 'zh-cn' : c === 'pt' ? 'pt-pt' : c; }
function qs(p) {   // the service wants the parameters sorted and lowercase (or it redirects)
  return Object.keys(p).sort().map(function (k) { var v = String(p[k]).toLowerCase(); return k + '=' + (k === 'languages' ? v : encodeURIComponent(v).replace(/%20/g, '+')); }).join('&');
}
function attempts(c) {
  var L = langs().slice().sort().join(','), nm = cleanTitle(c.oname && /[a-z]/i.test(c.oname) ? c.oname : c.name), alt = cleanTitle(c.name), list = [], year = c.year || nm.year || alt.year;
  if (c.kind === 'episode') {
    var se = c.season > 1 ? c.season : (seasonFromName(c.name) || c.season || 1), base = { languages: L, type: 'episode', season_number: se, episode_number: c.ep, order_by: 'download_count' };
    if (c.tmdb) list.push(merge(base, { parent_tmdb_id: c.tmdb }));
    if (c.eptmdb) list.push({ languages: L, tmdb_id: c.eptmdb, order_by: 'download_count' });
    if (nm.q) list.push(merge(base, { query: nm.q }));
    if (alt.q && alt.q !== nm.q) list.push(merge(base, { query: alt.q }));
  } else {
    var mb = { languages: L, type: 'movie', order_by: 'download_count' };
    if (c.tmdb) list.push(merge(mb, { tmdb_id: c.tmdb }));
    else if (c.imdb) list.push(merge(mb, { imdb_id: c.imdb }));
    if (nm.q && year) list.push(merge(mb, { query: nm.q, year: year }));
    if (nm.q) list.push(merge(mb, { query: nm.q }));
    if (alt.q && alt.q !== nm.q) list.push(merge(mb, { query: alt.q }));
  }
  return list.slice(0, 4);
}
function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
function results(j, c, p) {
  var L = langs(), out = [], seen = {};
  ((j && j.data) || []).forEach(function (d) {
    var a = (d && d.attributes) || {}, f = (a.files || [])[0], fd = a.feature_details || {}, li = L.indexOf(String(a.language || '').toLowerCase());
    if (!f || !f.file_id || (a.files || []).length > 1 || li < 0 || seen[f.file_id]) return;      // several-CD sets are skipped
    if (c.kind === 'episode' && p.season_number && fd.season_number && (Number(fd.season_number) !== Number(p.season_number) || Number(fd.episode_number) !== Number(p.episode_number))) return;
    seen[f.file_id] = 1;
    out.push({ id: f.file_id, lang: a.language.toLowerCase(), li: li, dl: Number(a.download_count) || 0, rel: String(a.release || f.file_name || '').replace(/\s+/g, ' '),
      mt: !!(a.machine_translated || a.ai_translated), hi: !!a.hearing_impaired, tr: !!a.from_trusted });
  });
  out.sort(function (x, y) { return x.li - y.li || (x.mt - y.mt) || (x.hi - y.hi) || (y.tr - x.tr) || (y.dl - x.dl); });
  return out;
}
function search(c) {
  return auth().then(function (a) {
    var list = attempts(c), i = 0;
    function next() {
      if (i >= list.length) return [];
      var p = list[i++];
      return req('GET', apiBase() + '/subtitles?' + qs(p), hdr(a.k, false, a.tok), null, 15000).then(function (r) {
        var j = pj(r.text);
        if (r.status !== 200 || !j) throw why(r, j);
        var out = results(j, c, p); return out.length ? out : next();
      });
    }
    return next();
  });
}

/* ---- the file: ask for a download link (counts against the daily limit), then fetch it ---- */
function fetchText(url) {
  return new Promise(function (res, rej) {
    var x = new XMLHttpRequest(), bin = !window.ANDROID_APP && typeof TextDecoder !== 'undefined' && typeof Uint8Array !== 'undefined';
    try { x.open('GET', url, true); x.timeout = 25000; } catch (e) { rej(err(t('osErr'), 'net')); return; }
    if (bin) { try { x.responseType = 'arraybuffer'; } catch (e2) { bin = false; } }
    if (window.ANDROID_APP) { try { x.setRequestHeader('X-Fallback-Charset', 'windows-1256'); } catch (e3) {} }    // read by the Android app, not sent
    x.onload = function () {
      if (x.status < 200 || x.status >= 300) { rej(err(t('osErr') + ' (HTTP ' + x.status + ')', 'http')); return; }
      if (!bin || !x.response) { res(String(x.responseText || '')); return; }
      var u8 = new Uint8Array(x.response), txt;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(u8); }
      catch (e4) { try { txt = new TextDecoder('windows-1256').decode(u8); } catch (e5) { txt = new TextDecoder('utf-8').decode(u8); } }   // old Arabic files
      res(txt);
    };
    x.onerror = x.ontimeout = function () { rej(err(t('osErr'), 'net')); };
    try { x.send(); } catch (e6) { rej(err(t('osErr'), 'net')); }
  });
}
function download(r) {
  return auth().then(function (a) {
    function ask(body) { return req('POST', apiBase() + '/download', hdr(a.k, true, a.tok), JSON.stringify(body), 15000); }
    return ask({ file_id: r.id, sub_format: 'srt' }).then(function (res) {
      if (res.status === 400 || res.status === 422) return ask({ file_id: r.id });            // in case the format option is refused
      return res;
    }).then(function (res) {
      var j = pj(res.text);
      if (res.status !== 200 || !j || !j.link) throw why(res, j);
      if (j.remaining != null) Store.set('osLeft', { n: j.remaining, t: Date.now() });
      return fetchText(j.link);
    });
  }).then(function (txt) { var c = parse(txt); if (c.length < 3) throw err(t('osBadFile'), 'file'); return c; });
}
/* SRT / WebVTT / ASS -> [{s, e, t}] in ms */
function tms(x) { var p = String(x).replace(',', '.').split(':'), sec = parseFloat(p.pop()) || 0, m = Number(p.pop() || 0), h = Number(p.pop() || 0); return Math.round(((h * 60 + m) * 60 + sec) * 1000); }
function clean(s) { return String(s || '').replace(/\\N/g, '\n').replace(/\{\\[^}]*\}/g, '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/g, ''); }
function parse(txt) {
  txt = String(txt || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  var out = [], m, re;
  if (/^\s*\[Script Info\]/i.test(txt) || /\nDialogue:/.test(txt)) {
    re = /^Dialogue:\s*[^,]*,([^,]+),([^,]+),(?:[^,]*,){6}(.*)$/gm;
    while ((m = re.exec(txt))) { var a = clean(m[3]); if (a) out.push({ s: tms(m[1]), e: tms(m[2]), t: a }); }
  } else {
    re = /((?:\d+:)?\d{1,2}:\d{1,2}[,.]\d{1,3})[ \t]*-->[ \t]*((?:\d+:)?\d{1,2}:\d{1,2}[,.]\d{1,3})[^\n]*\n([\s\S]*?)(?=\n[ \t]*\n|\n\d+\n(?:\d+:)?\d{1,2}:\d{1,2}[,.]\d{1,3}[ \t]*-->|$)/g;
    while ((m = re.exec(txt))) { var b = clean(m[3]); if (b) out.push({ s: tms(m[1]), e: tms(m[2]), t: b }); }
  }
  out = out.filter(function (c) { return c.e > c.s; });
  out.sort(function (x, y) { return x.s - y.s; });
  return out;
}

/* ---- kept on the device: the last few picked subtitles, by movie / episode ---- */
function cacheGet(k) { var l = Store.get('osCache', []) || [], i; for (i = 0; i < l.length; i++) if (l[i].k === k) return l[i]; return null; }
function cachePut(e) {
  var l = (Store.get('osCache', []) || []).filter(function (x) { return x.k !== e.k; }); l.unshift(e);
  while (l.length > 4 || (l.length > 1 && JSON.stringify(l).length > 900000)) l.pop();
  try { Store.set('osCache', l); } catch (x) {}
}
function cacheDrop(k) { Store.set('osCache', (Store.get('osCache', []) || []).filter(function (x) { return x.k !== k; })); }

/* ---- drawing: follows the player clock (smoothed between its ticks), honours the timing rows ---- */
var EX = null, exT = 0, O = { key: '', st: '', res: null, err: '', tok: 0 }, autoT = 0, noAuto = {};
function langName(c) { return Subs.langName(c === 'he' ? 'iw' : c === 'zh-cn' ? 'zh-CN' : String(c || '').split('-')[0]); }
function same(a, b) { a = String(a || '').toLowerCase().split('-')[0]; b = String(b || '').toLowerCase().split('-')[0]; if (a === 'iw') a = 'he'; if (b === 'iw') b = 'he'; return a === b; }
function needTr() { return EX && Prefs.subs && !same(EX.lang, Prefs.subLang); }
function nowMs() {
  var ms = Player.ms || 0, n = Date.now();
  if (ms !== EX.pm) { EX.pm = ms; EX.pa = n; }
  return ms + (Player.paused ? 0 : Math.min(700, n - EX.pa)) - (Subs.offset || 0);
}
function find(c, ms) { var lo = 0, hi = c.length - 1, r = -1; while (lo <= hi) { var md = (lo + hi) >> 1; if (c[md].s <= ms) { r = md; lo = md + 1; } else hi = md - 1; } return r; }
function pre(i) {   // translate the next few lines ahead, so they show without waiting
  for (var k = i; k < i + 3 && k < EX.cues.length; k++) {
    var tx = Subs.norm(EX.cues[k].t); if (!tx || EX.pend[tx] || Subs.cached(tx)) continue;
    EX.pend[tx] = 1; (function (q) { Subs.translate(q, function () { if (EX) delete EX.pend[q]; }); })(tx);
  }
}
function put(tx, res) { EX.last = res && !res.same && res.text ? [res.text, Prefs.subBoth ? tx : ''] : [tx, '']; Subs.draw(EX.last[0], EX.last[1]); }
function showCue(c) {
  var tx = Subs.norm(c.t), g = ++EX.g;
  clearTimeout(EX.slow); EX.last = null;
  if (!needTr()) { put(tx); return; }
  var hit = Subs.cached(tx); if (hit) { put(tx, hit); return; }
  EX.slow = setTimeout(function () { if (EX && g === EX.g) put(tx); }, 650);
  Subs.translate(tx, function (res) { if (!EX || g !== EX.g) return; clearTimeout(EX.slow); put(tx, res); });
}
function tick() {
  if (!EX) return;
  if (S.screen !== 'vod' && S.screen !== 'full') { if (EX.shown !== -1) { EX.shown = -1; Subs.draw(''); } return; }
  var c = EX.cues, ms = nowMs(), i = find(c, ms), cur = i >= 0 && c[i].e > ms ? i : -1;
  if (cur === EX.shown) {                                   // something else cleared the overlay (e.g. a subtitle setting changed): put the line back
    var el = Subs.mount(); if (cur >= 0 && EX.last && el && el.style.display === 'none') Subs.draw(EX.last[0], EX.last[1]);
    return;
  }
  EX.shown = cur;
  if (cur < 0) { EX.g++; EX.last = null; clearTimeout(EX.slow); Subs.draw(''); if (needTr()) pre(i + 1); return; }
  showCue(c[cur]); if (needTr()) pre(cur + 1);
}
function silenceOwn() {   // the player must not draw the file's own subtitles under ours
  try { if (Player.av) webapis.avplay.setSilentSubtitle(true); } catch (e) {}
  try { if (window.ANDROID_APP && window.__aeng === 'vlc' && window.AndroidPlayer && window.AndroidPlayer.spuOff) window.AndroidPlayer.spuOff(); } catch (e2) {}
  if (T.pcSpuOff) T.pcSpuOff();
}
function start(cues, r, k, quiet) {
  stop(); Subs.gen++; Subs.clear();
  EX = { cues: cues, lang: r.lang, id: r.id, key: k, label: langName(r.lang) + (r.rel ? ' · ' + r.rel.slice(0, 40) : ''), shown: -2, g: 0, pm: -1, pa: 0, pend: {}, slow: 0 };
  silenceOwn(); exT = setInterval(tick, 180); tick();
  if (!quiet) toast('🌐 ' + t('osLoaded') + ': ' + langName(r.lang) + (needTr() ? ' → ' + Subs.langName(Prefs.subLang) : ''), 2800);
}
function stop() { clearInterval(exT); exT = 0; if (EX) { clearTimeout(EX.slow); EX = null; Subs.draw(''); } }
function ctx() { var c = T.vodCtx ? T.vodCtx() : null; return c && S.screen === 'vod' ? c : null; }

function lookFor(c, auto) {
  if (!c) return;
  var tok = ++O.tok; O.key = c.key; O.st = 'busy'; O.res = null; O.err = ''; if (T.menuRefresh) T.menuRefresh();
  search(c).then(function (res) {
    if (tok !== O.tok) return; O.st = 'done'; O.res = res;
    if (auto) { var c2 = ctx(); if (res.length && c2 && c2.key === c.key && !EX) load(res[0], c2, true); }
    else if (!res.length) toast(t('osNoRes'), 2400);
    if (T.menuRefresh) T.menuRefresh();
  }, function (e) {
    if (tok !== O.tok) return; O.st = 'err'; O.err = (e && e.message) || t('osErr');
    if (!auto || e.kind === 'key') toast('⚠ ' + O.err, 3200);
    if (T.menuRefresh) T.menuRefresh();
  });
}
function load(r, c, auto) {
  var mine = c.key; toast(t('osLoading'), 2000);
  download(r).then(function (cues) {
    cachePut({ k: mine, id: r.id, lang: r.lang, rel: r.rel, cues: cues.map(function (q) { return [q.s, q.e, q.t]; }), at: Date.now() });
    var c2 = ctx(); if (c2 && c2.key === mine) start(cues, r, mine, false);
  }, function (e) { toast('⚠ ' + ((e && e.message) || t('osErr')), 3600); });
}
function fromCache(c) {
  var e = cacheGet(c.key); if (!e || !e.cues || !e.cues.length) return false;
  start(e.cues.map(function (q) { return { s: q[0], e: q[1], t: q[2] }; }), { id: e.id, lang: e.lang, rel: e.rel }, c.key, true);
  toast('🌐 ' + t('osLoaded') + ' (' + t('osSaved') + ')', 2200); return true;
}

/* ---- hooks into the subtitle module ---- */
var oCue = Subs.cue, oReset = Subs.reset, oNative = Subs.setNative;
Subs.cue = function () { if (EX) return; return oCue.apply(this, arguments); };       // the file's own cues are ignored while internet subtitles show
Subs.setNative = function (on) { if (EX && on) { this.native = false; silenceOwn(); return; } return oNative.apply(this, arguments); };
Subs.reset = function () { clearTimeout(autoT); stop(); return oReset.apply(this, arguments); };
/* called once a movie / episode is playing (after the subtitle module looked at the file's own tracks) */
Subs.vodReady = function () {
  var c = ctx(); if (!c) return;
  if (EX && EX.key === c.key) { silenceOwn(); return; }
  if (fromCache(c)) return;
  clearTimeout(autoT);
  if (key() && Store.get('osAuto', true) !== false && !noAuto[c.key]) {
    autoT = setTimeout(function () {                          // the player lists subtitle tracks late on some streams: wait, then only if there are none
      var c2 = ctx(); if (!c2 || c2.key !== c.key || c2.tok !== c.tok || EX) return;
      if (Player.tracks('TEXT').length) return;
      if ((Player.ms || 0) < (c2.startMs || 0) + 6000) return;  // not really playing (yet): keep the daily downloads
      lookFor(c2, true);
    }, 16000);
  }
};
Subs.extOn = function () { return !!EX; };
Subs.onlineItems = function () {
  var c = ctx(), it = [{ hdr: true, l: '🌐 ' + t('osT') }];
  if (!c) return [];
  if (!key()) { it.push({ l: t('osNeedKey'), dis: true }); return it; }
  if (EX) it.push({ l: '✓ ' + EX.label, dis: true }, { l: t('osStop'), osStop: 1 });
  // the status lines stay selectable (they do nothing), so the focus stays here while the search runs and lands on the results
  if (O.key === c.key && O.st === 'busy') it.push({ l: '⏳ ' + t('osFinding'), osNoop: 1 });
  else if (O.key === c.key && O.st === 'err') it.push({ l: '⚠ ' + O.err, osNoop: 1 }, { l: '🔍 ' + t('osRetry'), osFind: 1 });
  else if (O.key === c.key && O.st === 'done') {
    if (!O.res.length) it.push({ l: t('osNoRes'), osNoop: 1 });
    O.res.slice(0, 14).forEach(function (r) {
      var tr = Prefs.subs && !same(r.lang, Prefs.subLang);
      // the release name / download count go in their own left-to-right part (they would jumble inside Arabic text)
      it.push({ l: langName(r.lang) + (tr ? ' → ' + Subs.langName(Prefs.subLang) : '') + (r.mt ? ' (' + t('osMT') + ')' : ''),
        ltr: (r.rel.length > 14 ? r.rel.slice(0, 13) + '…' : r.rel) + '  ⬇' + (r.dl >= 1000 ? (r.dl / 1000).toFixed(r.dl >= 10000 ? 0 : 1) + 'k' : r.dl),
        osPick: r, sel: !!(EX && EX.id === r.id) });
    });
    it.push({ l: '🔍 ' + t('osRetry'), osFind: 1 });
  } else it.push({ l: '🔍 ' + t('osFind'), osFind: 1 });
  return it;
};
Subs.onlineAct = function (x) {
  if (!x) return false;
  if (x.osNoop) return 'keep';
  if (x.osFind) { lookFor(ctx(), false); return 'keep'; }
  if (x.osStop) {
    var k = EX && EX.key; stop(); if (k) { cacheDrop(k); noAuto[k] = 1; }
    Subs.setNative(true, true); Subs.ready(); toast(t('osStop'), 1600); return true;
  }
  if (x.osPick) { var c = ctx(); if (c) load(x.osPick, c, false); return true; }
  return false;
};
/* Settings → test: the key (and the account, when given) */
Subs.osTest = function (v) {
  var k = v ? String(v.osKey || '').replace(/\s+/g, '') : key(), u = v ? v.osUser : Store.get('osUser', ''), p = v ? v.osPass : Store.get('osPass', '');
  if (!k) return Promise.reject(err(t('osNeedKey'), 'key'));
  if (u && p) return login(k, u, p, true).then(function () { var tk = Store.get('osTok', null); return t('osOk') + (tk && tk.dl ? ' — ' + tk.dl + ' ' + t('osLeft') : ''); });
  return req('GET', API + '/infos/formats', hdr(k), null, 12000).then(function (r) {      // needs nothing but a valid key
    var j = pj(r.text);
    if (r.status === 200 && j) return t('osOk');
    throw why(r, j);
  });
};
Subs.__os = { parse: parse, cleanTitle: cleanTitle, attempts: attempts, qs: qs, results: results, state: function () { return { ex: EX && { lang: EX.lang, id: EX.id, n: EX.cues.length, shown: EX.shown }, o: O }; } };
})();
