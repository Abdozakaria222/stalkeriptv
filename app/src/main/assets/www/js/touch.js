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
  'html.touch input{-webkit-user-select:text;user-select:text}html.touch .hint{display:none!important}' +
  '#tbk{position:fixed;left:10px;top:10px;width:46px;height:46px;border-radius:23px;background:rgba(10,15,24,.78);border:2px solid rgba(34,211,238,.7);color:#e9f0fa;font:26px/42px sans-serif;text-align:center;z-index:99999;display:none}' +
  '#tbk.on{display:block}' +
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
function sync() { var scr = S.screen; bk.classList.toggle('on', scr !== 'accounts' && scr !== 'full'); }
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
var g = null;
doc.addEventListener('touchstart', function (e) {
  if (e.touches.length !== 1) { g = null; return; }
  var t = e.touches[0]; g = { x: t.clientX, y: t.clientY, ax: t.clientX, ay: t.clientY, t: Date.now(), moved: false, axis: '', el: doc.elementFromPoint(t.clientX, t.clientY), accX: 0, accY: 0 };
}, { passive: true });
doc.addEventListener('touchmove', function (e) {
  if (!g) return; var t = e.touches[0], dx = t.clientX - g.ax, dy = t.clientY - g.ay;
  if (!g.moved) { if (Math.abs(t.clientX - g.x) < 14 && Math.abs(t.clientY - g.y) < 14) return; g.moved = true; g.axis = Math.abs(t.clientY - g.y) >= Math.abs(t.clientX - g.x) ? 'y' : 'x'; }
  g.ax = t.clientX; g.ay = t.clientY;
  var screen = S.screen;
  if (g.axis === 'y') {
    g.accY += dy; var p = pitch(g.el, 'y'), n = Math.floor(Math.abs(g.accY) / p);
    if (screen === 'vod' || screen === 'full') { if (n >= 1 && !g.fired) { g.fired = 1; var d = g.accY < 0 ? 'up' : 'down'; if (screen === 'full') { if (T.swipeLive) T.swipeLive(d === 'up' ? 'down' : 'up', 1, g.el); } else key(d === 'up' ? 'up' : 'down'); } return; }
    if (n >= 1) { var dir = g.accY < 0 ? 'down' : 'up'; g.accY -= (g.accY < 0 ? -1 : 1) * n * p; if (!(T.swipeMedia && T.swipeMedia(dir, n, g.el))) if (T.swipeLive) T.swipeLive(dir, n, g.el); }
  } else {
    g.accX += dx; var px = pitch(g.el, 'x'), m = Math.floor(Math.abs(g.accX) / px);
    if (m >= 1) { var dr = g.accX < 0 ? 'right' : 'left'; g.accX -= (g.accX < 0 ? -1 : 1) * m * px; if (screen === 'vod') { dr = dx < 0 ? 'left' : 'right'; for (var i = 0; i < Math.min(m, 3); i++) key(dr); } else if (T.swipeMedia) T.swipeMedia(dr, m, g.el); }
  }
}, { passive: true });
doc.addEventListener('touchend', function (e) {
  var q = g; g = null; if (!q || q.moved || Date.now() - q.t > 700) return;
  var el = q.el; if (!el) return;
  if (up(el, 'input')) return;
  e.preventDefault && e.cancelable && e.preventDefault();
  if (T.tapMedia && T.tapMedia(el, q.x, q.y)) return;
  if (T.tapLive && T.tapLive(el, q.x, q.y)) return;
  var f = up(el, '.f,[data-act],.btn,.srow,.row');
  if (f) { try { T.Nav.set(f); } catch (e2) {} key('ok'); }
}, { passive: false });
})();
