/* Stalker TV (PC build) - runs before the app. Sends every cross-origin request through the local proxy
 * (so the browser's CORS / forbidden-header rules do not apply, exactly like the TV) and keeps the server informed. */
(function () {
'use strict';
var info = { pc: false, ff: false };
try { var x0 = new XMLHttpRequest(); x0.open('GET', '/__info', false); x0.send(); info = JSON.parse(x0.responseText); } catch (e) {}
window.PC = info; if (!info.pc) return;
document.documentElement.classList.add('pcmode');
var P = XMLHttpRequest.prototype, open = P.open, send = P.send, setH = P.setRequestHeader;
P.open = function (m, u, a) { this.__pu = String(u); this.__pm = m; this.__pa = a !== false; this.__ph = {}; return open.apply(this, arguments); };
P.setRequestHeader = function (k, v) { if (this.__ph) this.__ph[k] = v; else setH.call(this, k, v); };
P.send = function (b) {
  var abs = '', k;
  try { abs = new URL(this.__pu, location.href); } catch (e) { abs = null; }
  if (abs && /^https?:$/.test(abs.protocol) && abs.origin !== location.origin) {
    open.call(this, this.__pm || 'GET', '/p?u=' + encodeURIComponent(abs.href) + '&h=' + encodeURIComponent(JSON.stringify(this.__ph || {})), this.__pa);
  } else { for (k in this.__ph) { try { setH.call(this, k, this.__ph[k]); } catch (e2) {} } }
  return send.call(this, b);
};
// the layout is 1920x1080 scaled down: nothing may ever scroll the page (focusing an off-screen item would shift the whole app)
try { var st = document.createElement('style'); st.textContent = 'html,body{overflow:clip!important}'; document.head.appendChild(st); } catch (e) {}
function unscroll() { try { var d = document.documentElement, b = document.body; if (d.scrollLeft || d.scrollTop) { d.scrollLeft = 0; d.scrollTop = 0; } if (b && (b.scrollLeft || b.scrollTop)) { b.scrollLeft = 0; b.scrollTop = 0; } } catch (e) {} }
window.addEventListener('scroll', unscroll, true); document.addEventListener('focusin', function () { setTimeout(unscroll, 0); });
function ping() { try { var x = new XMLHttpRequest(); x.open('GET', '/__ping', true); x.send(); } catch (e) {} }
ping(); setInterval(ping, 10000);
// F = full screen (F11 also works)
document.addEventListener('keydown', function (e) {
  var ae = document.activeElement; if (ae && ae.tagName === 'INPUT') return;
  if (e.keyCode === 70 && !e.ctrlKey && !e.altKey) {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e2) {}
  }
});
})();
