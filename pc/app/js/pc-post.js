/* Stalker TV (PC build) - runs after app.js. Gives the <video> element the abilities of the TV's AVPlay:
 * plays HLS / TS / MKV / AC3 through ffmpeg on the local server, seeks, switches audio tracks and reads the movie's own subtitles. */
(function () {
'use strict';
var T = window.__tv, PC = window.PC || {};
if (!T || !PC.pc) return;
var vid = document.getElementById('vid'), P = T.Player, enc = encodeURIComponent;
var AR = { pcNoFf: 'القنوات المباشرة محتاجة ffmpeg وهو غير مثبّت. اقفل البرنامج وشغّله تاني ووافق على التحميل (أو ضع ffmpeg في مجلد ffmpeg)', pcSubLoad: 'جاري تحضير الترجمة من الملف…', pcDl: 'جاري تحميل ffmpeg لتشغيل القنوات… انتظر دقيقة ثم أعد فتح القناة', vlcKeys: 'VLC: V الترجمة · B الصوت · H/G تأخير أو تقديم الترجمة · Esc رجوع', vlcFail: 'تعذّر تشغيل VLC', subDelay: 'توقيت الترجمة', subDelayK: 'G / H على الكيبورد = تقديم / تأخير الترجمة ربع ثانية' };
var EN = { pcNoFf: 'Live TV needs ffmpeg, which is not installed. Restart the app and accept the download (or put ffmpeg in the "ffmpeg" folder)', pcSubLoad: 'Preparing the subtitles from the file…', pcDl: 'Downloading ffmpeg for live TV… wait a minute, then open the channel again', vlcKeys: 'VLC: V subtitles · B audio · H/G subtitle delay · Esc back', vlcFail: 'Could not start VLC', subDelay: 'Subtitle timing', subDelayK: 'G / H on the keyboard = subtitles a quarter second earlier / later' };
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

var pd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src'), cd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime'), dd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'duration');
vid.addEventListener('error', function () { if (!C || C.mode !== 'ff') return; setTimeout(function () { fetch('/__last').then(function (r) { return r.json(); }).then(function (j) { if (j && j.err) T.toast('ffmpeg: ' + j.err, 12000); }).catch(function () {}); }, 600); });
var C = null, tk = 0, pendingStart = 0, warned = false;



/* ---- VLC (shipped with the app): every channel / movie / episode can play through VLC instead of ffmpeg (Settings -> engine).
 *      'emb' = VLC draws the picture inside this window, over the app's video area; the keys stay with the app.
 *      'ext' = fallback: VLC's own full-screen window.  A quiet stand-in "video element" keeps resume, next episode,
 *      the progress bar and "back" working exactly as with the other engine. ---- */
var V = null, vTimer = 0, rTimer = 0, vq = Promise.resolve();
function engine() { var e = T.Store.get('pcplayer', 'vlc'); return e === 'builtin' ? 'ffmpeg' : e; }
function vlcOn() { return !!PC.vlc && engine() !== 'ffmpeg'; }
function vEmb() { return !!(V && V.mode === 'emb'); }
function vfire(n) { try { vid.dispatchEvent(new Event(n)); } catch (e) {} }
function vget(path) { return fetch(path).then(function (r) { return r.json(); }); }
/* control requests go out one after another (a "stop" must never overtake the "play" that follows it) */
function vseq(path) { var p = vq.then(function () { return vget(path); }); vq = p.catch(function () {}); return p; }
function vcmd(c, v) { return vseq('/vlc/cmd?c=' + c + (v !== undefined ? '&v=' + enc(v) : '')).catch(function () {}); }
function vstop(kill) {
  clearInterval(vTimer); clearInterval(rTimer); vTimer = rTimer = 0; var was = V; V = null; lastRect = '';
  if (kill && was) vcmd('stop');
}
function startVlc(u, ss, abs) {
  vstop(false);
  var live = /\/live\//i.test(abs.pathname) || (/\.(m3u8|ts)$/i.test(abs.pathname) && !/\/(movie|series)\//i.test(abs.pathname));
  var me = V = { u: u, t: 0, len: 0, paused: false, live: live, seen: false, ended: false, err: false, miss: 0, t0: Date.now(), mode: '', tracks: null, vw: 0, vh: 0 };
  vseq('/vlc/play?u=' + enc(u) + '&ss=' + (ss || 0) + (live ? '&live=1' : '') + '&asp=' + enc(T.Prefs.aspect || 'fit') + '&sz=' + enc(T.Prefs.subSize || 'm') + (engine() === 'vlcwin' ? '&win=1' : '')).then(function (j) {
    if (V !== me) return;
    if (!j.ok) { V = null; T.toast(T.t('vlcFail'), 5000); vfire('error'); return; }
    me.mode = j.mode || 'ext';
    if (me.mode === 'ext') T.toast(T.t('vlcKeys'), 6000);
    vTimer = setInterval(function () { vpoll(me); }, 400);
    if (me.mode === 'emb') { rTimer = setInterval(vrect, 120); }
  }).catch(function () { if (V === me) { V = null; vfire('error'); } });
}
function loadTracks(me) {
  vget('/vlc/tracks').then(function (j) { if (V === me && j) me.tracks = j; }).catch(function () {});
}
function vpoll(me) {
  vget('/vlc/status').then(function (st) {
    if (V !== me) return;
    if (me.mode === 'emb') {
      if (!st.running) return;
      if (st.state === 'error') { if (!me.err) { me.err = true; vfire('error'); } return; }
      if (st.state === 'ended') { if (!me.ended) { me.ended = true; me.t = me.len || me.t; vfire('ended'); } return; }
      if (st.state === 'starting' || st.state === 'stopped') return;
    } else {
      if (!st.running) {
        if (!me.seen && Date.now() - me.t0 < 15000 && ++me.miss < 4) return;             // still launching
        var done = me.len > 0 && me.t >= me.len - 5, wasSeen = me.seen; vstop(false);
        if (done) vfire('ended');
        else if (wasSeen) { var scr = T.S.screen; try { if (scr === 'full' || scr === 'vod') T.handleKey('back'); else P.stop(); } catch (e) {} }   // VLC closed by the user: back to the list
        else vfire('error');
        return;
      }
      if (st.wasfs && st.fs === false && me.seen) { vstop(true); try { T.handleKey('back'); } catch (e) {} return; }   // Esc in VLC's window
      if (st.state === 'starting') return;
    }
    me.t = st.time || 0; me.len = st.length || 0; me.paused = st.state === 'paused'; me.vw = st.vw || 0; me.vh = st.vh || 0;
    if (!me.seen) {
      if (st.state !== 'playing' && st.state !== 'paused') return;
      me.seen = true; vfire('loadedmetadata'); vfire('playing');
      if (me.mode === 'emb') { loadTracks(me); setTimeout(function () { loadTracks(me); }, 3000); setTimeout(function () { loadTracks(me); }, 9000); }
    } else if (st.state === 'buffering') { if (!me.buf) { me.buf = true; vfire('waiting'); } }
    else if (st.state === 'playing' && me.buf) { me.buf = false; vfire('playing'); }
    vfire('timeupdate');
  }).catch(function () {});
}
/* where the picture goes: the app's video area (preview box or full screen), made smaller while the app shows its
 * info bar / menu on top, hidden on the other screens. Sent in device pixels of this window. */
var lastRect = '';
function vrect() {
  if (!V || V.mode !== 'emb') return;
  var scr = T.S.screen, show = V.seen && !V.err && !V.ended && (scr === 'full' || scr === 'vod' || scr === 'browse'), r = null, o;
  if (show) { var bb = vid.getBoundingClientRect(); r = { x: bb.left, y: bb.top, w: bb.width, h: bb.height }; if (r.w < 40 || r.h < 30) show = false; }
  if (show) {
    var L = r.x, R = r.x + r.w, Tp = r.y, B = r.y + r.h;
    if (scr === 'full' && (o = document.querySelector('#s-full.show .ibar'))) B = Math.min(B, o.getBoundingClientRect().top - 8);
    if (scr === 'vod' && (o = document.querySelector('#s-vod.show .vp'))) B = Math.min(B, o.getBoundingClientRect().top - 8);
    var pm = document.getElementById('pmenu');
    if (pm && pm.style.display === 'block') { var pr = pm.getBoundingClientRect(); if (pr.left + pr.width / 2 > window.innerWidth / 2) R = Math.min(R, pr.left); else L = Math.max(L, pr.right); }
    var k = Math.min((R - L) / r.w, (B - Tp) / r.h, 1);
    if (k < 0.3) show = false;
    else if (k < 1) { var nw = r.w * k, nh = r.h * k; r = { x: L + (R - L - nw) / 2, y: Tp + (B - Tp - nh) / 2, w: nw, h: nh }; }   // smaller, same shape
  }
  var d = window.devicePixelRatio || 1;
  var key = show ? [Math.round(r.x * d), Math.round(r.y * d), Math.round(r.w * d), Math.round(r.h * d)].join(',') : 'hide';
  if (key === lastRect) return; lastRect = key;
  var q = show ? key.split(',') : [0, 0, 0, 0];
  vget('/vlc/rect?x=' + q[0] + '&y=' + q[1] + '&w=' + q[2] + '&h=' + q[3] + '&v=' + (show ? 1 : 0)).catch(function () { lastRect = ''; });
}
var vPause = vid.pause, vPlay = vid.play;
vid.pause = function () { if (V) { V.paused = true; vcmd('pause'); return; } return vPause.apply(this, arguments); };
vid.play = function () { if (V) { V.paused = false; vcmd('play'); return Promise.resolve(); } return vPlay.apply(this, arguments); };
(function () {
  var pdsc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'paused'), wd = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoWidth'), hd = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoHeight');
  Object.defineProperty(vid, 'paused', { configurable: true, get: function () { return V ? !!V.paused : pdsc.get.call(vid); } });
  Object.defineProperty(vid, 'videoWidth', { configurable: true, get: function () { return V ? V.vw : wd.get.call(vid); } });
  Object.defineProperty(vid, 'videoHeight', { configurable: true, get: function () { return V ? V.vh : hd.get.call(vid); } });
})();
function logical() { if (V) return V.t; return cd.get.call(vid) + (C && C.mode === 'ff' ? C.off : 0); }
function raw(u) { pd.set.call(vid, u); }
function playUrl() { C.pid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); return '/play?u=' + enc(C.u) + '&ss=' + (C.off || 0) + '&a=' + (C.a || 0) + (C.live ? '&np=1' : '&pid=' + C.pid + (C.si >= 0 ? '&si=' + C.si : '')); }

Object.defineProperty(vid, 'src', { configurable: true, get: function () { return pd.get.call(vid); }, set: function (u) { setSrc(String(u)); } });
Object.defineProperty(vid, 'currentTime', { configurable: true, get: function () { return logical(); }, set: function (t) { if (V) { if (!V.live) { V.t = t; vcmd('seek', Math.round(t)); } return; } if (C && C.mode === 'ff') seekFF(t); else cd.set.call(vid, t); } });
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
  if (V) {
    if (!vEmb() || !V.tracks) return [];
    var l = type === 'AUDIO' ? V.tracks.a : type === 'TEXT' ? V.tracks.s : [];
    return (l || []).filter(function (x) { return x[0] >= 0; }).map(function (x) { return { index: x[0], label: x[1] }; });
  }
  if (C && C.info) {
    if (type === 'AUDIO' && C.mode === 'ff') return C.info.a.map(function (x) { return { index: x.i, label: (x.lang || x.title || ('#' + (x.i + 1))).toUpperCase() + ' · ' + x.codec + (x.ch ? ' ' + x.ch + 'ch' : '') }; });
    if (type === 'TEXT') return C.info.s.filter(function (x) { return x.text; }).map(function (x) { return { index: x.i, label: x.lang || x.title || ('#' + (x.i + 1)) }; });
  }
  return oTracks.apply(this, arguments);
};
P.selectTrack = function (type, idx) {
  if (V) { if (vEmb()) { if (type === 'AUDIO') { vcmd('audio', idx); if (V.tracks) V.tracks.ca = idx; } else if (type === 'TEXT') { vcmd('spu', idx); if (V.tracks) V.tracks.cs = idx; } } return; }
  if (C && C.info && type === 'AUDIO' && C.mode === 'ff') { if (C.a !== idx) { C.a = idx; reloadFF(logical()); } return; }
  if (C && C.info && type === 'TEXT') { loadSub(idx); return; }
  return oSel.apply(this, arguments);
};

/* stream info panel: which engine and what it knows */
var oInfo = P.info;
P.info = function () {
  var o = oInfo.apply(this, arguments);
  if (V) { o.engine = V.mode === 'emb' ? 'VLC' : 'VLC (' + (T.getLang() === 'ar' ? 'نافذة' : 'window') + ')'; o.w = V.vw || 0; o.h = V.vh || 0; o.buf = -1; o.dropped = -1; o.live = !!V.live; o.dur = (V.len || 0) * 1000; o.pos = (V.t || 0) * 1000; }
  else if (C && C.mode === 'ff') {
    o.engine = 'ffmpeg'; var inf = C.info || {}, vv = inf.v || {}, aa = (inf.a || [])[C.a || 0] || (inf.a || [])[0];
    if (vv.codec) o.vcodec = vv.codec; if (vv.w) { o.w = o.w || vv.w; o.h = o.h || vv.h; }
    if (aa) { o.acodec = aa.codec; o.ach = aa.ch || 0; }
  }
  return o;
};
var oAsp = P.applyAspect;
P.applyAspect = function () { var r = oAsp.apply(this, arguments); if (vEmb()) vcmd('aspect', T.Prefs.aspect || 'fit'); return r; };
/* with VLC the subtitles are drawn by VLC itself: the app's subtitle menu becomes a list of the file's tracks (+ off) */
function hookSubs() {
  if (!T.Subs || T.Subs.__vlc) return; T.Subs.__vlc = true;
  var oReady = T.Subs.ready, oItems = T.Subs.menuItems, oAct = T.Subs.menuAct, oApply = T.Subs.applyOffset;
  /* subtitle timing (menu rows and G / H): VLC moves its own subtitles; with ffmpeg the cue list is shifted (both directions) */
  T.Subs.applyOffset = function () {
    if (V) { if (vEmb()) vcmd('sdelay', this.offset / 1000); this.lag = 0; return; }
    if (sub) { sub.delay = -this.offset / 1000; sub.shown = -2; this.lag = 0; return; }
    return oApply.apply(this, arguments);
  };
  T.Subs.ready = function () { if (V) { this.active = false; this.native = true; return; } return oReady.apply(this, arguments); };
  T.Subs.menuItems = function () {
    if (!V) return oItems.apply(this, arguments);
    var it = [{ hdr: true, l: T.t('subsT') }], tr = V.tracks || {}, sp = tr.s || [];
    if (!vEmb()) { it.push({ l: T.t('vlcKeys'), dis: true }); return it; }
    var S0 = T.Subs;
    it.push({ l: T.t('subTiming') + ': ' + S0.fmtOff(), dis: true }, { l: '◀  ' + T.t('subEarlier'), subShift: -500 }, { l: T.t('subLater') + '  ▶', subShift: 500 });
    if (S0.offset) it.push({ l: T.t('subResetT'), subShift: 0 });
    if (sp.length <= 1) it.push({ l: T.t('subNone'), dis: true });
    else { it.push({ hdr: true, l: T.t('subTrack') }); sp.forEach(function (x) { it.push({ l: x[0] < 0 ? T.t('off') : x[1], vspu: x[0], sel: x[0] === tr.cs }); }); }
    it.push({ l: T.t('subDelayK'), dis: true });
    return it;
  };
  T.Subs.menuAct = function (x) {
    if (x && x.vspu !== undefined) { vcmd('spu', x.vspu); if (V && V.tracks) V.tracks.cs = x.vspu; T.toast(T.t('subsT') + ': ' + x.l, 1600); return true; }
    if (V && !(x && x.subShift !== undefined)) return false;
    return oAct.apply(this, arguments);
  };
  /* subtitles from the internet: with VLC inside the window the picture covers the page, so VLC draws each line itself */
  var oDraw = T.Subs.draw;
  T.Subs.draw = function (main, orig) {
    var r = oDraw.apply(this, arguments);
    if (V) {
      var want = vEmb() && T.Subs.extOn && T.Subs.extOn() && main && (T.S.screen === 'vod' || T.S.screen === 'full') ? String(main) + (orig ? '\n' + orig : '') : '';
      if (want !== (V.marq || '')) { V.marq = want; vcmd('marq', want); }
    }
    return r;
  };
  T.pcSpuOff = function () { if (vEmb()) { vcmd('spu', -1); if (V.tracks) V.tracks.cs = -1; } };
}
if (T.Subs) hookSubs(); else document.addEventListener('DOMContentLoaded', hookSubs);

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
  var ae = document.activeElement, scr = T.S && T.S.screen; if ((ae && ae.tagName === 'INPUT') || e.ctrlKey || e.altKey || e.metaKey || (e.keyCode !== 71 && e.keyCode !== 72)) return;
  if (scr !== 'full' && scr !== 'vod') return;
  if (!(vEmb() || (!V && sub))) return;
  T.Subs.shift(e.keyCode === 72 ? 250 : -250); e.stopPropagation();
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
