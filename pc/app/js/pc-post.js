/* Stalker TV (PC build) - runs after app.js. Gives the <video> element the abilities of the TV's AVPlay:
 * plays HLS / TS / MKV / AC3 through ffmpeg on the local server, seeks, switches audio tracks and reads the movie's own subtitles. */
(function () {
'use strict';
var T = window.__tv, PC = window.PC || {};
if (!T || !PC.pc) return;
var vid = document.getElementById('vid'), P = T.Player, enc = encodeURIComponent;
var AR = { pcNoFf: 'القنوات المباشرة محتاجة ffmpeg وهو غير مثبّت. اقفل البرنامج وشغّله تاني ووافق على التحميل (أو ضع ffmpeg في مجلد ffmpeg)', pcSubLoad: 'جاري تحضير الترجمة من الملف…', pcDl: 'جاري تحميل ffmpeg لتشغيل القنوات… انتظر دقيقة ثم أعد فتح القناة', vlcKeys: 'VLC: V الترجمة · B الصوت · H/G تأخير أو تقديم الترجمة · Esc رجوع', vlcFail: 'تعذّر تشغيل VLC' };
var EN = { pcNoFf: 'Live TV needs ffmpeg, which is not installed. Restart the app and accept the download (or put ffmpeg in the "ffmpeg" folder)', pcSubLoad: 'Preparing the subtitles from the file…', pcDl: 'Downloading ffmpeg for live TV… wait a minute, then open the channel again', vlcKeys: 'VLC: V subtitles · B audio · H/G subtitle delay · Esc back', vlcFail: 'Could not start VLC' };
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

var pd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src'), cd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime'), dd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'duration');
vid.addEventListener('error', function () { if (!C || C.mode !== 'ff') return; setTimeout(function () { fetch('/__last').then(function (r) { return r.json(); }).then(function (j) { if (j && j.err) T.toast('ffmpeg: ' + j.err, 12000); }).catch(function () {}); }, 600); });
var C = null, tk = 0, pendingStart = 0, warned = false;



/* ---- VLC: when installed (and not switched off in Settings) every channel / movie / episode plays in VLC, which decodes everything
 *      and shows the file's own subtitles itself (no delay). This page keeps a quiet "video element" in sync with it so resume,
 *      next episode, the progress and "back" work exactly as before. ---- */
var V = null, vTimer = 0;
function vlcOn() { return !!PC.vlc && T.Store.get('pcplayer', 'vlc') === 'vlc'; }
function vfire(n) { try { vid.dispatchEvent(new Event(n)); } catch (e) {} }
function vget(path) { return fetch(path).then(function (r) { return r.json(); }); }
function vstop(kill) { clearInterval(vTimer); vTimer = 0; if (kill && V) vget('/vlc/cmd?c=stop').catch(function () {}); V = null; }
function startVlc(u, ss, abs) {
  vstop(false);
  var live = /\/live\//i.test(abs.pathname) || (/\.(m3u8|ts)$/i.test(abs.pathname) && !/\/(movie|series)\//i.test(abs.pathname));
  var me = V = { u: u, t: 0, len: 0, paused: false, live: live, seen: false, first: true, ended: false, miss: 0, t0: Date.now() };
  vget('/vlc/play?u=' + enc(u) + '&ss=' + (ss || 0) + (live ? '&live=1' : '')).then(function (j) {
    if (V !== me) return;
    if (!j.ok) { V = null; T.toast(T.t('vlcFail'), 5000); vfire('error'); return; }
    T.toast(T.t('vlcKeys'), 6000);
    vTimer = setInterval(function () { vpoll(me); }, 500);
  }).catch(function () { if (V === me) { V = null; vfire('error'); } });
}
function vpoll(me) {
  vget('/vlc/status').then(function (st) {
    if (V !== me) return;
    if (!st.running) {
      if (!me.seen && Date.now() - me.t0 < 15000 && ++me.miss < 4) return;             // still launching
      var done = me.len > 0 && me.t >= me.len - 5, wasSeen = me.seen; vstop(false);
      if (done) vfire('ended');
      else if (wasSeen) { var scr = T.S.screen; try { if (scr === 'full' || scr === 'vod') T.handleKey('back'); else P.stop(); } catch (e) {} }   // VLC closed by the user: back to the list
      else vfire('error');
      return;
    }
    if (st.state === 'starting') return;
    me.t = st.time || 0; me.len = st.length || 0; me.paused = st.state === 'paused';
    if (!me.seen) { me.seen = true; vfire('loadedmetadata'); vfire('playing'); }
    else if (st.state === 'playing' && me.buf) { me.buf = false; vfire('playing'); }
    vfire('timeupdate');
  }).catch(function () {});
}
var vPause = vid.pause, vPlay = vid.play;
vid.pause = function () { if (V) { V.paused = true; vget('/vlc/cmd?c=pause').catch(function () {}); return; } return vPause.apply(this, arguments); };
vid.play = function () { if (V) { V.paused = false; vget('/vlc/cmd?c=play').catch(function () {}); return Promise.resolve(); } return vPlay.apply(this, arguments); };
(function () { var pdsc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'paused'); Object.defineProperty(vid, 'paused', { configurable: true, get: function () { return V ? !!V.paused : pdsc.get.call(vid); } }); })();

function logical() { if (V) return V.t; return cd.get.call(vid) + (C && C.mode === 'ff' ? C.off : 0); }
function raw(u) { pd.set.call(vid, u); }
function playUrl() { C.pid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); return '/play?u=' + enc(C.u) + '&ss=' + (C.off || 0) + '&a=' + (C.a || 0) + (C.live ? '&np=1' : '&pid=' + C.pid + (C.si >= 0 ? '&si=' + C.si : '')); }

Object.defineProperty(vid, 'src', { configurable: true, get: function () { return pd.get.call(vid); }, set: function (u) { setSrc(String(u)); } });
Object.defineProperty(vid, 'currentTime', { configurable: true, get: function () { return logical(); }, set: function (t) { if (V) { if (!V.live) { V.t = t; vget('/vlc/cmd?c=seek&v=' + Math.round(t)).catch(function () {}); } return; } if (C && C.mode === 'ff') seekFF(t); else cd.set.call(vid, t); } });
Object.defineProperty(vid, 'duration', { configurable: true, get: function () { if (V) return V.live ? NaN : V.len; return C && C.mode === 'ff' && C.dur > 0 ? C.dur : dd.get.call(vid); } });

function setSrc(u) {
  var tok = ++tk, ss = pendingStart > 5000 ? pendingStart / 1000 : 0; pendingStart = 0; C = null;
  var abs; try { abs = new URL(u, location.href); } catch (e) { abs = null; }
  if (!abs || !/^https?:$/.test(abs.protocol) || abs.origin === location.origin) { raw(u); return; }
  if (vlcOn()) { startVlc(u, ss, abs); return; }
  if (PC.ff) { go(u, abs, tok, ss); return; }
  // ffmpeg may have been installed (or finished downloading) since the page loaded
  fetch('/__info').then(function (r) { return r.json(); }).catch(function () { return PC; }).then(function (i) {
    if (tok !== tk) return; if (i.ff) PC.ff = true; PC.dl = i.dl;
    go(u, abs, tok, ss);
  });
}
function go(u, abs, tok, ss) {
  if (!PC.ff) {
    if (PC.dl === 'downloading') T.toast(T.t('pcDl'), 8000);
    else if (!warned && !/\.(mp4|m4v|webm|mov)(\?|#|$)/i.test(abs.pathname)) { warned = true; T.toast(T.t('pcNoFf'), 15000); }
    C = { mode: 'direct', u: u, off: 0, info: null }; raw('/p?u=' + enc(u)); vid.play().catch(function () {}); return;
  }
  // live channels: no probe (one connection instead of two - many providers allow only one - and faster zapping)
  if (/\/live\//i.test(abs.pathname) || (/\.(m3u8|ts)$/i.test(abs.pathname) && !/\/(movie|series)\//i.test(abs.pathname))) {
    C = { mode: 'ff', u: u, off: 0, dur: 0, a: 0, info: null, live: true }; raw(playUrl()); var p0 = vid.play(); if (p0 && p0.catch) p0.catch(function () {}); return;
  }
  fetch('/probe?u=' + enc(u)).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }).then(function (info) {
    if (tok !== tk) return;
    if (info.ok && info.direct) { C = { mode: 'direct', u: u, off: 0, info: info }; raw('/p?u=' + enc(u)); }
    else { C = { mode: 'ff', u: u, off: ss, dur: info.dur || 0, a: 0, si: -1, info: info.ok ? info : null }; C.defSi = defSub(info); raw(playUrl()); }
    var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
  });
}
function defSub(info) {
  var ts = ((info && info.s) || []).filter(function (x) { return x.text; }), en = ts.filter(function (x) { return /^en/i.test(x.lang || ''); });
  return en.length ? en[0].i : ts.length ? ts[0].i : -1;
}
function reloadFF(at) {
  if (!C || C.mode !== 'ff') return;
  C.off = Math.max(0, at); var old = vid.onloadedmetadata, paused = P.paused;
  vid.onloadedmetadata = function () { vid.onloadedmetadata = old; if (paused) { try { vid.pause(); } catch (e) {} } };
  raw(playUrl()); if (!paused) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
  if (sub && sub.live) startPoll(sub.idx);
}
function seekFF(t) {
  if (!C || C.dur <= 0) return;                         // live: nothing to seek
  t = Math.max(0, Math.min(t, C.dur - 1));
  if (Math.abs(t - logical()) < 1.5) return;
  reloadFF(t);
}

var oPlay = P.play, oStop = P.stop, oTracks = P.tracks, oSel = P.selectTrack;
P.play = function (url, h, opts) { pendingStart = (opts && opts.startMs) || 0; return oPlay.apply(this, arguments); };
P.stop = function () { tk++; C = null; stopPoll(); sub = null; vstop(true); return oStop.apply(this, arguments); };
P.tracks = function (type) {
  if (V) return [];
  if (C && C.info) {
    if (type === 'AUDIO' && C.mode === 'ff') return C.info.a.map(function (x) { return { index: x.i, label: (x.lang || x.title || ('#' + (x.i + 1))).toUpperCase() + ' · ' + x.codec + (x.ch ? ' ' + x.ch + 'ch' : '') }; });
    if (type === 'TEXT') return C.info.s.filter(function (x) { return x.text; }).map(function (x) { return { index: x.i, label: x.lang || x.title || ('#' + (x.i + 1)) }; });
  }
  return oTracks.apply(this, arguments);
};
P.selectTrack = function (type, idx) {
  if (C && C.info && type === 'AUDIO' && C.mode === 'ff') { if (C.a !== idx) { C.a = idx; reloadFF(logical()); } return; }
  if (C && C.info && type === 'TEXT') { loadSub(idx); return; }
  return oSel.apply(this, arguments);
};

/* ---- the movie's own subtitles (ffmpeg extracts them to WebVTT; shown through the app's normal subtitle pipeline) ---- */
var sub = null;
function tsec(h, m, s, ms) { return (Number(h) || 0) * 3600 + Number(m) * 60 + Number(s) + Number(('0.' + ms)) ; }
function parseVTT(txt) {
  var out = []; String(txt).replace(/\r/g, '').split(/\n\n+/).forEach(function (b) {
    var m = b.match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)\s*-->\s*(?:(\d+):)?(\d+):(\d+)[.,](\d+)[^\n]*\n([\s\S]+)/); if (!m) return;
    out.push({ s: tsec(m[1], m[2], m[3], m[4]), e: tsec(m[5], m[6], m[7], m[8]), t: m[9].replace(/^\s+|\s+$/g, '') });
  });
  out.sort(function (a, b) { return a.s - b.s; }); return out;
}
var pollT = 0;
function stopPoll() { clearInterval(pollT); pollT = 0; }
function startPoll(idx) {
  stopPoll(); if (!C || C.mode !== 'ff' || !C.pid) return;
  var mine = { idx: idx, cues: [], shown: -2, live: true, pos: 0, buf: '' }, pid = C.pid; sub = mine;
  function pull() {
    if (sub !== mine || !C || C.pid !== pid) { stopPoll(); return; }
    fetch('/subfile?pid=' + pid + '&from=' + mine.pos).then(function (r) { var sh = parseFloat(r.headers.get('X-Shift')); if (sh >= 0) mine.shift = sh; return r.arrayBuffer(); }).then(function (ab) {
      if (sub !== mine || !ab.byteLength) return;
      mine.pos += ab.byteLength; mine.buf += new TextDecoder('utf-8').decode(ab, { stream: true });
      var cut = mine.buf.lastIndexOf('\n\n');
      if (cut >= 0) { var part = mine.buf.slice(0, cut); mine.buf = mine.buf.slice(cut + 2); var add = parseVTT(part); if (add.length) mine.cues = mine.cues.concat(add); }
      mine.all = mine.cues.concat(parseVTT(mine.buf)); mine.all.sort(function (x, y) { return x.s - y.s; });   // the last cue has no blank line after it until the next one is written
    }).catch(function () {});
  }
  pull(); pollT = setInterval(pull, 1200);
}
function loadSub(idx) {
  if (C && C.mode === 'ff' && C.pid) {                    // the playing ffmpeg writes the subtitle itself while it streams
    if (C.si === idx || (C.si < 0 && C.defSi === idx)) { startPoll(idx); return; }
    C.si = idx; sub = { idx: idx, cues: [], shown: -2, live: true, pos: 0, buf: '' }; reloadFF(logical()); return;
  }
  var u = C.u, mine = { idx: idx, cues: null, shown: -2 }; sub = mine; T.toast(T.t('pcSubLoad'), 2500);
  fetch('/sub?u=' + enc(u) + '&i=' + idx).then(function (r) { return r.text(); }).then(function (txt) { if (sub === mine) mine.cues = parseVTT(txt); }).catch(function () {});
}
vid.addEventListener('timeupdate', function () {
  if (!sub || !(sub.all || sub.cues) || !P.onSub) return;
  var t = (sub.live ? cd.get.call(vid) : logical()) + (sub.delay || 0), sh = sub.shift || 0, c = sub.all || sub.cues, i, hit = -1;
  for (i = 0; i < c.length; i++) { if (c[i].s + sh > t) break; if (c[i].e + sh > t) hit = i; }
  if (hit !== sub.shown) { sub.shown = hit; if (hit < 0) P.onSub('', 0); else P.onSub(c[hit].t, (c[hit].e + sh - t) * 1000); }
});

/* F11 = full screen (native window via pywebview, or the browser's Fullscreen API); A = cycle the picture fit while watching */
function toggleFS() {
  try { if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) { window.pywebview.api.toggle_fullscreen(); return; } } catch (e) {}
  var d = document, de = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
  else { var f = de.requestFullscreen || de.webkitRequestFullscreen; if (f) { var r = f.call(de); if (r && r.catch) r.catch(function () {}); } }
}
window.addEventListener('keydown', function (e) {
  var ae = document.activeElement; if (V || !sub || (ae && ae.tagName === 'INPUT') || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.keyCode === 71 || e.keyCode === 72) { sub.delay = (sub.delay || 0) + (e.keyCode === 71 ? -0.5 : 0.5); sub.shown = -2; T.toast('\u2194 ' + (sub.delay > 0 ? '+' : '') + sub.delay.toFixed(1) + 's', 1400); e.stopPropagation(); }
}, true);
var ASP = ['fit', 'fill', 'zoom', '169', '43', '219'], ASPN = { fit: 'aspFit', fill: 'aspFill', zoom: 'aspZoom', '169': 'asp169', '43': 'asp43', '219': 'asp219' };
window.addEventListener('keydown', function (e) {
  if (e.keyCode === 122) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) toggleFS(); return; }
  var ae = document.activeElement, scr = T.S && T.S.screen;
  if (e.keyCode === 65 && !e.ctrlKey && !e.altKey && !e.metaKey && !(ae && ae.tagName === 'INPUT') && (scr === 'full' || scr === 'vod' || scr === 'browse')) {
    e.preventDefault(); e.stopPropagation();
    T.Prefs.aspect = ASP[(ASP.indexOf(T.Prefs.aspect) + 1) % ASP.length]; T.savePrefs(); P.applyAspect(); T.toast(T.t('aspect') + ': ' + T.t(ASPN[T.Prefs.aspect]), 1600);
  }
}, true);
})();
