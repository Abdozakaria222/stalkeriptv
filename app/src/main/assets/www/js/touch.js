/* Stalker TV (Android build) - touch layer, loaded after the app.
 *  tap        = open the thing under the finger directly (no need to focus it first)
 *  drag       = scroll the list / grid / row under the finger (one step per row/card of travel)
 *  full screen: tap = show info, swipe up/down = next/previous channel; movies: tap = show bar / pause, drag on the bar = seek, swipe sideways = seek
 *  a round back button replaces the TV remote's Back key */
(function () {
'use strict';
var T = window.__tv; if (!T || !window.ANDROID_APP) return;
var S = T.S, doc = document, html = doc.documentElement;
html.classList.add('touch');
var st = doc.createElement('style');
st.textContent = 'html.touch,html.touch *{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
  'html.touch input{-webkit-user-select:text;user-select:text}html.touch .hint,html.touch body.e2 .keys,html.touch .vhint{display:none!important}' +
  '#tbk{position:fixed;left:10px;top:10px;width:46px;height:46px;border-radius:23px;background:rgba(10,15,24,.78);border:2px solid rgba(34,211,238,.7);color:#e9f0fa;font:26px/42px sans-serif;text-align:center;z-index:99999;display:none}' +
  '#tbk.on{display:block}' +
  '#tmenu{position:fixed;right:10px;top:10px;width:46px;height:46px;border-radius:23px;background:rgba(10,15,24,.78);border:2px solid rgba(34,211,238,.7);color:#e9f0fa;font:24px/42px sans-serif;text-align:center;z-index:99999;display:none}' +
  '#tmenu.on{display:block}html.touch #pmenu .pmi{height:78px}html.touch #pmenu .pmmore{height:44px;line-height:44px;font-size:30px}' +
  'html.phone #pmenu{width:820px}html.phone #pmenu .pmi{height:84px}html.phone #pmenu .pmt{font-size:44px}' +
  'html.phone #s-lib .sr{font-size:32px}html.phone #s-lib .sr .sc{font-size:28px}html.phone #s-lib .gn{font-size:31px;line-height:36px;height:72px}html.phone #s-lib .ltab{font-size:32px}' +
  'html.phone #s-lib .lmeta{font-size:30px}html.phone #s-lib .lplot{font-size:28px;line-height:38px}html.phone #s-lib .lsearch input{font-size:30px}' +
  'html.phone .pn{font-size:30px}html.phone body.e2 .ch .meta b{font-size:36px}html.phone body.e2 .ch .ev,html.phone .ch .ev{font-size:28px}' +
  'html.phone .dbtn{font-size:34px}html.phone .schip{font-size:30px}html.phone .eptx b{font-size:30px}html.phone .eptx i{font-size:26px}' +
  'html.phone .tile .tn{font-size:50px}html.phone .pmi{font-size:34px}html.phone .pmh{font-size:28px}html.phone .rt{font-size:24px!important}';
doc.head.appendChild(st);
function ph() { html.classList.toggle('phone', Math.min(window.innerWidth, window.innerHeight, screen.width, screen.height) < 600); }
ph(); window.addEventListener('resize', ph);
var bk = doc.createElement('div'); bk.id = 'tbk'; bk.textContent = '←'; doc.body.appendChild(bk);
function key(k) { try { T.handleKey(k); } catch (e) {} }
bk.addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); key('back'); });
var mb = doc.createElement('div'); mb.id = 'tmenu'; mb.textContent = '\u2630'; doc.body.appendChild(mb);   // the TV's yellow "menu" key: quality, picture, audio, subtitles
mb.addEventListener('touchend', function (e) {
  e.preventDefault(); e.stopPropagation();
  if (T.menu.open) key('back'); else if (T.openMenu) T.openMenu(S.screen === 'vod' ? 'vod' : 'live');
  sync();
});
/* the round back button shows for a few seconds after the screen is touched (it would cover the clock / tabs otherwise) */
var bkOn = false, bkT = 0;
function touched() { bkOn = true; clearTimeout(bkT); bkT = setTimeout(function () { bkOn = false; sync(); }, 4000); sync(); }
function sync() {
  var scr = S.screen, play = scr === 'full' || scr === 'vod';
  var osd = !!doc.querySelector('#s-full.show,#s-vod.show');
  bk.classList.toggle('on', scr !== 'accounts' && (bkOn || (play && (osd || T.menu.open))));
  mb.classList.toggle('on', play && (T.menu.open || osd));
}
setInterval(sync, 400);

function sc() { return T.scale ? T.scale() : 0.5; }
function up(el, sel) { while (el && el.nodeType === 1) { if (el.matches && el.matches(sel)) return el; el = el.parentNode; } return null; }
/* distance (screen px) of finger travel that equals one step, for the thing under the finger */
function pitch(el, axis) {
  var s = sc(), p;
  if (axis === 'y') p = up(el, '#lside,.sr') ? 60 : up(el, '#catBox') ? 78 : up(el, '#chBox') ? 86 : up(el, '#pmenu') ? 64 : up(el, '.gc,#lgrid') ? 420 : up(el, '.pcw') ? 420 : up(el, '.ep,.deps') ? 120 : 160;
  else p = up(el, '.pcw') ? 224 : 100;
  return Math.max(26, p * s * 0.8);
}
var g = null, mom = 0;
function stopMom() { if (mom) { cancelAnimationFrame(mom); mom = 0; } }
/* pixel scroll of whatever is under the finger; dx/dy in screen px */
function scrollAt(el, dx, dy, axis) {
  var k = 1 / sc(), a = dx * k, b = dy * k;
  if (T.scrollMedia && T.scrollMedia(el, a, b, axis)) return true;
  if (T.scrollLive && T.scrollLive(el, a, b, axis)) return true;
  return false;
}
/* The finger's events are taken on the element where the touch started: when a list redraws under the finger
 * (menus, virtual lists) that element leaves the page and its events would no longer reach the document. */
function live(q, x, y) { if (!q.el || !q.el.isConnected) q.el = doc.elementFromPoint(x, y); return q.el; }
function onStart(e) {
  stopMom(); touched();
  if (g && g.tg) unhook(g.tg);
  if (e.touches.length !== 1) { g = null; return; }
  var tg = e.target;
  if (tg && (tg.id === 'tbk' || tg.id === 'tmenu')) { g = null; return; }      // the round buttons handle themselves
  var t = e.touches[0]; g = { x: t.clientX, y: t.clientY, ax: t.clientX, ay: t.clientY, t: Date.now(), moved: false, axis: '', el: doc.elementFromPoint(t.clientX, t.clientY), accX: 0, accY: 0, free: false, vx: 0, vy: 0, lt: Date.now(), tg: tg };
  if (tg && tg.addEventListener) { tg.addEventListener('touchmove', onMove, { passive: true }); tg.addEventListener('touchend', onEnd, { passive: false }); tg.addEventListener('touchcancel', onCancel, { passive: true }); }
}
function unhook(tg) { try { tg.removeEventListener('touchmove', onMove); tg.removeEventListener('touchend', onEnd); tg.removeEventListener('touchcancel', onCancel); } catch (x) {} }
function onCancel() { if (g && g.tg) unhook(g.tg); g = null; }
function onMove(e) {
  if (!g) return; var t = e.touches[0], dx = t.clientX - g.ax, dy = t.clientY - g.ay, now = Date.now();
  if (!g.moved) {
    if (Math.abs(t.clientX - g.x) < 12 && Math.abs(t.clientY - g.y) < 12) return;
    g.moved = true; g.axis = Math.abs(t.clientY - g.y) >= Math.abs(t.clientX - g.x) ? 'y' : 'x';
    dx = t.clientX - g.x; dy = t.clientY - g.y;
  }
  g.ax = t.clientX; g.ay = t.clientY;
  var dt = Math.max(1, now - g.lt); g.lt = now; g.vx = g.vx * 0.6 + (dx / dt) * 0.4; g.vy = g.vy * 0.6 + (dy / dt) * 0.4;
  var screen = S.screen, el = live(g, t.clientX, t.clientY);
  if (T.menu.open || (screen !== 'vod' && screen !== 'full')) {
    var ok = g.axis === 'y' ? scrollAt(el, 0, dy, 'y') : scrollAt(el, dx, 0, 'x');
    if (ok) { g.free = true; return; }
  }
  /* screens without free scrolling: one step per row / card of travel */
  if (g.axis === 'y') {
    g.accY += dy; var p = pitch(el, 'y'), n = Math.floor(Math.abs(g.accY) / p);
    if (screen === 'vod' || screen === 'full') { if (n >= 1 && !g.fired) { g.fired = 1; var d = g.accY < 0 ? 'up' : 'down'; if (screen === 'full') { if (T.swipeLive) T.swipeLive(d === 'up' ? 'down' : 'up', 1, el); } else key(d === 'up' ? 'up' : 'down'); } return; }
    if (n >= 1) { var dir = g.accY < 0 ? 'down' : 'up'; g.accY -= (g.accY < 0 ? -1 : 1) * n * p; if (!(T.swipeMedia && T.swipeMedia(dir, n, el))) if (T.swipeLive) T.swipeLive(dir, n, el); }
  } else {
    g.accX += dx; var px = pitch(el, 'x'), m = Math.floor(Math.abs(g.accX) / px);
    if (m >= 1) { var dr = g.accX < 0 ? 'right' : 'left'; g.accX -= (g.accX < 0 ? -1 : 1) * m * px; if (screen === 'vod') { dr = dx < 0 ? 'left' : 'right'; for (var i = 0; i < Math.min(m, 3); i++) key(dr); } else if (screen === 'full') { if (!g.fired) { g.fired = 1; if (T.swipeLive) T.swipeLive(dr, 1, el); } } else if (T.swipeMedia) T.swipeMedia(dr, m, el); }
  }
}
function fling(q, v) {
  var last = performance.now();
  (function step(now) {
    var dt = Math.min(40, now - last); last = now; v *= Math.pow(0.94, dt / 16);
    if (Math.abs(v) < 0.04) { mom = 0; return; }
    var d = v * dt, el = live(q, q.ax, q.ay);
    if (!(q.axis === 'y' ? scrollAt(el, 0, d, 'y') : scrollAt(el, d, 0, 'x'))) { mom = 0; return; }
    mom = requestAnimationFrame(step);
  })(last);
}
function onEnd(e) {
  var q = g; g = null; if (!q) return;
  if (q.tg) unhook(q.tg);
  if (q.moved) { if (q.free && Date.now() - q.lt < 90) { var v = q.axis === 'y' ? q.vy : q.vx; if (Math.abs(v) > 0.25) fling(q, v * 1.1); } return; }
  if (Date.now() - q.t > 700) return;
  var el = live(q, q.x, q.y); if (!el) return;
  if (up(el, 'input')) return;
  e.preventDefault && e.cancelable && e.preventDefault();
  if (T.tapMedia && T.tapMedia(el, q.x, q.y)) return;
  if (T.tapLive && T.tapLive(el, q.x, q.y)) return;
  var f = up(el, '.f,[data-act],.btn,.srow,.row');
  if (f) { try { T.Nav.set(f); } catch (e2) {} key('ok'); }
}
doc.addEventListener('touchstart', onStart, { passive: true });
})();
