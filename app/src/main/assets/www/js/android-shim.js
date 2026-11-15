/* Stalker TV (Android build) - runs before the app. Gives the page the same abilities as on the Samsung TV:
 *  - webapis.avplay  -> implemented by the native Media3/ExoPlayer view that sits behind the (transparent) WebView
 *  - XMLHttpRequest  -> routed through the native HTTP client (no CORS, custom headers like Cookie/User-Agent allowed)
 *  - touch / back / remote keys -> translated to the key events the app already understands */
(function () {
'use strict';
var AP = window.AndroidPlayer, AN = window.AndroidNet;
if (!AP || !AN) return;
window.ANDROID_APP = true;

/* ---------- network ---------- */
var REQ = {}, nid = 0;
function FX() { this.readyState = 0; this.status = 0; this.responseText = ''; this.response = ''; this.timeout = 0; this._h = {}; this._rh = {}; this._id = 0; }
FX.prototype.open = function (m, u) { this._m = m || 'GET'; this._u = String(u); this.readyState = 1; };
FX.prototype.setRequestHeader = function (k, v) { this._h[k] = v; };
FX.prototype.getResponseHeader = function (k) { var v = this._rh[String(k).toLowerCase()]; return v == null ? null : v; };
FX.prototype.abort = function () { if (this._id) { try { AN.cancel(this._id); } catch (e) {} delete REQ[this._id]; this._id = 0; } };
FX.prototype.send = function () { var id = ++nid; this._id = id; REQ[id] = this; AN.request(id, this._m, this._u, JSON.stringify(this._h), this.timeout || 20000); };
window.__net = { done: function (id, status, hdrs) {
  var x = REQ[id]; if (!x) return; delete REQ[id]; x._id = 0;
  if (status < 0) { x.status = 0; x.readyState = 4; var f = status === -2 ? (x.ontimeout || x.onerror) : x.onerror; if (f) f.call(x); return; }
  x.status = status; try { x._rh = JSON.parse(hdrs || '{}'); } catch (e) { x._rh = {}; }
  x.responseText = AN.body(id); x.response = x.responseText; x.readyState = 4;
  if (x.onreadystatechange) x.onreadystatechange(); if (x.onload) x.onload();
} };
window.XMLHttpRequest = function () { return new FX(); };

/* ---------- AVPlay on top of ExoPlayer ---------- */
var L = {}, P = { pending: false, ok: null, err: null }, rect = [0, 0, 1920, 1080];
function push() {
  var app = document.getElementById('app'); if (!app) return;
  var m = /scale\(([\d.]+)\)/.exec(app.style.transform || ''), s = m ? parseFloat(m[1]) : 1, l = parseFloat(app.style.left) || 0, t = parseFloat(app.style.top) || 0;
  AP.setRect(l + rect[0] * s, t + rect[1] * s, rect[2] * s, rect[3] * s);
}
window.addEventListener('resize', function () { setTimeout(push, 60); });
window.__avp = { ev: function (n, a, b) {
  if (n === 'prepared') { P.pending = false; if (P.ok) P.ok(); }
  else if (n === 'error') { if (P.pending) { P.pending = false; if (P.err) P.err(a); } else if (L.onerror) L.onerror(a); }
  else if (n === 'bufstart') { if (L.onbufferingstart) L.onbufferingstart(); }
  else if (n === 'bufend') { if (L.onbufferingcomplete) L.onbufferingcomplete(); }
  else if (n === 'completed') { if (L.onstreamcompleted) L.onstreamcompleted(); }
  else if (n === 'time') { if (L.oncurrentplaytime) L.oncurrentplaytime(a); }
  else if (n === 'sub') { if (L.onsubtitlechange) L.onsubtitlechange(a, b); }
} };
window.webapis = { avplay: {
  open: function (u) { P.pending = false; AP.open(String(u)); },
  setListener: function (o) { L = o || {}; },
  setBufferingParam: function () {},
  setDisplayRect: function (x, y, w, h) { rect = [x, y, w, h]; push(); },
  setDisplayMethod: function (m) { AP.setResize(/FULL_SCREEN/.test(m) ? 'fill' : /CROPPED/.test(m) ? 'zoom' : 'fit'); },
  prepareAsync: function (ok, err) { P.ok = ok; P.err = err; P.pending = true; AP.prepare(); },
  getDuration: function () { return AP.duration(); },
  play: function () { AP.play(); }, pause: function () { AP.pause(); }, stop: function () { AP.stop(); }, close: function () { AP.close(); },
  seekTo: function (ms, ok) { AP.seek(ms); if (ok) try { ok(); } catch (e) {} },
  suspend: function () {}, restore: function () {},
  getTotalTrackInfo: function () { try { return JSON.parse(AP.tracks()); } catch (e) { return []; } },
  setSelectTrack: function (type, idx) { AP.selectTrack(String(type), idx | 0); },
  setSilentSubtitle: function (b) { AP.silentSub(!!b); }
} };
window.tizen = { application: { getCurrentApplication: function () { return { exit: function () { AP.exit(); } }; } } };

/* ---------- keys + touch ---------- */
window.__key = function (code) {
  function mk(type) { var e = document.createEvent('Event'); e.initEvent(type, true, true); e.keyCode = code; e.which = code; e.key = ''; return e; }
  (document.activeElement || document).dispatchEvent(mk('keydown')); (document.activeElement || document).dispatchEvent(mk('keyup'));
};
var tx = 0, ty = 0, ax = 0, ay = 0, tt = 0, moved = false, STEP = 70;
document.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = ax = t.clientX; ty = ay = t.clientY; tt = Date.now(); moved = false; }, { passive: true });
document.addEventListener('touchmove', function (e) {
  var t = e.touches[0], dx = t.clientX - ax, dy = t.clientY - ay;
  if (Math.abs(dx) < STEP && Math.abs(dy) < STEP) return;
  moved = true; ax = t.clientX; ay = t.clientY;
  if (Math.abs(dy) >= Math.abs(dx)) window.__key(dy < 0 ? 40 : 38); else window.__key(dx < 0 ? 39 : 37);
}, { passive: true });
document.addEventListener('touchend', function (e) {
  if (moved || Date.now() - tt > 450) return;
  var el = document.elementFromPoint(tx, ty), f = el && el.closest ? el.closest('.f,[data-act],[data-id],.row,.btn,input') : null;
  if (f && f.tagName === 'INPUT') return;
  try { if (f && window.__tv && window.__tv.Nav && window.__tv.Nav.set) window.__tv.Nav.set(f); } catch (e2) {}
  window.__key(13);
}, { passive: true });
})();
