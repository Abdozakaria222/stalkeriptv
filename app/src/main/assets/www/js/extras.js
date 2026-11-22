/* Stalker TV — add an account from your phone, no relay and nothing else to run:
 * the TV shows a QR code that opens a private ntfy.sh topic on the phone; whatever the phone posts there
 * (a line like "http://host:8080 user pass" or "http://portal/c/ 00:1A:79:..") is read by the TV and turned into an account. */
(function () {
'use strict';
var T = window.__tv, $ = T.$, t = T.t, esc = T.esc, Store = T.Store, S = T.S, go = T.go, toast = T.toast;

var AR = {
  qrAdd: 'إضافة من الهاتف', qrTitle: 'أضف حسابك من هاتفك', qrS1: 'صوّر الكود بكاميرا الهاتف وافتح الرابط', qrS2: 'اكتب في خانة الرسالة سطراً واحداً بالصيغة الموضّحة', qrS3: 'اضغط إرسال — يظهر الحساب هنا خلال ثوانٍ',
  qrWait: 'في انتظار الهاتف…', qrGot: 'تمت إضافة', qrNew: 'كود جديد', qrBadMsg: 'لم أفهم الرسالة. اكتب: السيرفر ثم اسم المستخدم ثم كلمة المرور', qrNoNet: 'لا يوجد اتصال بالإنترنت',
  minWord: 'د', remain: 'متبقي', endsAt: 'ينتهي', origQ: 'أصلية', qTop: 'أعلى جودة متاحة', qLow: 'أقل جودة متاحة', crashed: 'أُغلق التطبيق فجأة المرة الماضية', diagT: 'تشخيص الإغلاق المفاجئ', diagNone: 'لا يوجد', diagScreen: 'آخر إغلاق مفاجئ على شاشة', diagErr: 'آخر خطأ',
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'ملاحظة: الرسالة تمر عبر خدمة ntfy.sh على رابط سري عشوائي. لا تستخدم الكود إلا لنفسك.',
  ptT: 'اكتب من موبايلك', ptS: 'صوّر الكود مرة واحدة وسيب الصفحة مفتوحة على الموبايل، اكتب واضغط إرسال', ptWait: 'جاهز — في انتظار الموبايل…', ptGot: 'وصل من الموبايل',
  ptRow: 'الكتابة من الموبايل', ptNote: 'لما تقف على خانة بحث أو كتابة يظهر كود QR صغير: اللي تكتبه على الموبايل يتكتب في الخانة على طول'
};
var EN = {
  qrAdd: 'Add from phone', qrTitle: 'Add your account from your phone', qrS1: 'Scan the code with your phone camera and open the link', qrS2: 'Type one line in the message box, in the format shown', qrS3: 'Tap send — the account appears here in seconds',
  qrWait: 'Waiting for your phone…', qrGot: 'Added', qrNew: 'New code', qrBadMsg: 'Could not understand the message. Type: server, username, password', qrNoNet: 'No internet connection',
  minWord: 'min', remain: 'Left', endsAt: 'Ends', origQ: 'Source', qTop: 'Highest quality', qLow: 'Lowest quality', crashed: 'The app closed unexpectedly last time', diagT: 'Crash diagnostics', diagNone: 'None', diagScreen: 'Last unexpected close on screen', diagErr: 'Last error',
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'Note: the message passes through ntfy.sh on a random secret link. Use the code only for yourself.',
  ptT: 'Type from your phone', ptS: 'Scan once and keep the page open on the phone, type and tap send', ptWait: 'Ready — waiting for your phone…', ptGot: 'Received from the phone',
  ptRow: 'Type from phone', ptNote: 'When a search or text box is selected, a small QR shows: what you type on the phone goes straight into the box'
};
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

/* ---- turn free text from the phone into an account (accepts what IPTV providers usually send) ---- */
var MACRE = /\b([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\b/;
var LABEL = /^(name|server|host|portal|url|user|username|login|pass|password|pwd|mac)\s*[:=]\s*/i;
function qparam(url, k) { var m = String(url).match(new RegExp('[?&]' + k + '=([^&\\s#]+)', 'i')); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
function hostLike(x) {
  return /^https?:\/\//i.test(x) || /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(x) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/\S*)?$/.test(x) || /^[a-z0-9-]+:\d+(\/\S*)?$/i.test(x);
}
function parseAccount(text) {
  text = String(text || '').replace(/\r/g, '\n'); var m, kv = {}, rest = [];
  text.split(/\n+/).forEach(function (ln) {
    var mm = ln.match(/^\s*(name|server|host|portal|url|user|username|login|pass|password|pwd|mac)\s*[:=]\s*(\S.*?)\s*$/i);
    if (mm && !/\s(?:name|server|host|portal|url|user|username|login|pass|password|pwd|mac)[:=]/i.test(mm[2])) kv[mm[1].toLowerCase()] = mm[2]; else rest.push(ln);
  });
  var name = kv.name || '', portal = kv.server || kv.host || kv.portal || kv.url || '', user = kv.user || kv.username || kv.login || '', pass = kv.pass || kv.password || kv.pwd || '', mac = kv.mac || '';
  // an M3U style link: http://host:port/get.php?username=U&password=P&type=m3u
  m = text.match(/https?:\/\/[^\s]*?\/(?:get|player_api|panel_api)\.php\?[^\s]*/i);
  if (m && qparam(m[0], 'username') && qparam(m[0], 'password')) {
    var o = m[0].match(/^(https?:\/\/[^\/]+)/i);
    return { type: 'xtream', name: name, portal: o ? o[1] : '', user: qparam(m[0], 'username'), pass: qparam(m[0], 'password'), mac: '' };
  }
  var free = [], i;
  rest.join(' ').replace(/[|,;]/g, ' ').split(/\s+/).forEach(function (x) {
    var lm = x.match(/^(name|server|host|portal|url|user|username|login|pass|password|pwd|mac)[:=](\S+)$/i);
    if (lm) kv[lm[1].toLowerCase()] = lm[2]; else if (x) free.push(x);
  });
  name = name || kv.name || ''; portal = portal || kv.server || kv.host || kv.portal || kv.url || ''; user = user || kv.user || kv.username || kv.login || ''; pass = pass || kv.pass || kv.password || kv.pwd || ''; mac = mac || kv.mac || '';
  if (!mac) { var m2 = text.match(MACRE); if (m2) mac = m2[1]; }
  free = free.filter(function (x) { return !MACRE.test(x); });
  if (!portal) { for (i = 0; i < free.length; i++) if (hostLike(free[i])) { portal = free[i]; free.splice(i, 1); break; } }
  else free = free.filter(function (x) { return x !== portal; });
  if (!portal) return null;
  if (mac) return { type: 'stalker', name: name, portal: portal, mac: mac.toUpperCase() };
  if (!user) user = free.shift() || '';
  if (!pass) pass = free.shift() || '';
  if (!user || !pass) return null;
  return { type: 'xtream', name: name, portal: portal, user: user, pass: pass, mac: '' };
}
T.parseAccount = parseAccount;

/* ---- QR flow ---- */
var Q = { topic: '', base: '', tok: 0, timer: 0, seen: {}, fails: 0 };
function ntfyBase() { return String(Store.get('ntfy', 'https://ntfy.sh') || 'https://ntfy.sh').replace(/\/+$/, ''); }
function newTopic() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', out = 'stv-', i, a = null;
  try { a = new Uint8Array(22); (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { a = null; }
  for (i = 0; i < 22; i++) out += chars.charAt((a ? a[i] : Math.floor(Math.random() * 256)) % 36);
  return out;
}
/* the TV may fail to reach ntfy.sh directly (old TLS roots / ISP block): try plain http, then the relay, and remember what worked */
function pollUrls() {
  var u = Q.base + '/' + Q.topic + '/json?poll=1&since=all', l = [u], rel = T.relayOf ? T.relayOf(T.S.acc || {}) : '';
  if (/^https:/i.test(Q.base)) l.push(u.replace(/^https:/i, 'http:'));
  if (rel) l.push(rel + '/?u=' + encodeURIComponent(u) + '&h=' + encodeURIComponent('{}'));
  
  return { list: l, orig: 0 };
}
function rawGet(url, ms) {
  return new Promise(function (res, rej) {
    var x = new XMLHttpRequest(), kind = /relay|\/\?u=/.test(url) ? 'relay' : /^https:/i.test(url) ? 'https' : 'http';
    function bad(why) { Q.err = kind + ': ' + why; rej(why); }
    try { x.open('GET', url, true); x.timeout = ms; } catch (e) { bad('open'); return; }
    x.onload = function () { if (x.status >= 200 && x.status < 300) res(x.responseText); else bad('HTTP ' + x.status); };
    x.onerror = function () { bad('blocked/TLS'); }; x.ontimeout = function () { bad('timeout'); };
    try { x.send(); } catch (e2) { bad('send'); }
  });
}
function stopPoll() { clearTimeout(Q.timer); Q.tok++; }

function render() {
  var url = Q.base + '/' + Q.topic, svg;
  try { svg = window.QRCode.svg(url, 460); } catch (e) { svg = ''; }
  $('#s-qr').innerHTML = '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="qrbox">' +
    '<div class="qrl"><h1>' + esc(t('qrTitle')) + '</h1>' +
    '<ol><li><b>1</b>' + esc(t('qrS1')) + '</li><li><b>2</b>' + esc(t('qrS2')) + '</li><li><b>3</b>' + esc(t('qrS3')) + '</li></ol>' +
    '<div class="qrfmt"><div><span>' + esc(t('qrFmtX')) + '</span><code>http://host:8080 username password</code></div><div><span>' + esc(t('qrFmtS')) + '</span><code>http://portal.com/c/ 00:1A:79:AB:CD:EF</code></div></div>' +
    '<div class="qrwait" id="qrwait"><i></i><span>' + esc(t('qrWait')) + '</span></div><div class="qrnote">' + esc(t('qrNote')) + '</div></div>' +
    '<div class="qrr"><div class="qrimg">' + svg + '</div><div class="qrurl">' + esc(url) + '</div></div></div>' +
    T.hintBar([['y', '●', t('qrNew')], ['', '⟲', t('back')]]);
  T.Nav.cur = null;
}
function setNote(txt, warn) { var w = $('#qrwait'); if (!w) return; w.className = 'qrwait' + (warn ? ' warn' : ''); w.lastChild.textContent = txt; }
function openQr() {
  stopPoll(); go('qr'); Q.topic = newTopic(); Q.base = ntfyBase(); Q.seen = {}; Q.fails = 0; Q.vi = 0; render();
  poll(Q.tok);
}
function poll(tok) {
  Q.timer = setTimeout(function () {
    if (tok !== Q.tok || S.screen !== 'qr') return;
    var pu = pollUrls(), idx = Q.vi || 0; if (idx >= pu.list.length) idx = 0;
    rawGet(pu.list[idx], 7000).then(function (txt) {
      if (tok !== Q.tok || S.screen !== 'qr') return;
      Q.vi = idx; Q.good = pu.list[idx];
      if (Q.fails) { Q.fails = 0; setNote(t('qrWait')); }
      var got = [], bad = 0;
      String(txt || '').split('\n').forEach(function (ln) {
        if (!ln) return; var j; try { j = JSON.parse(ln); } catch (e) { return; }
        if (j.event !== 'message' || !j.message || Q.seen[j.id]) return; Q.seen[j.id] = 1;
        var a = parseAccount(j.message); if (a) got.push(a); else bad++;
      });
      if (got.length) { received(got); return; }
      if (bad) { setNote(t('qrBadMsg'), true); toast(t('qrBadMsg'), 3200); }
      poll(tok);
    }, function () { if (tok !== Q.tok || S.screen !== 'qr') return; Q.vi = (idx + 1) % pu.list.length; if (++Q.fails >= pu.list.length + 1) setNote(t('qrNoNet') + ' — ' + Q.err, true); poll(tok); });
  }, 2500);
}
function same(a, b) { return a.type === b.type && String(a.portal).toLowerCase() === String(b.portal).toLowerCase() && (a.type === 'xtream' ? a.user === b.user : String(a.mac).toUpperCase() === String(b.mac).toUpperCase()); }
function received(list) {
  stopPoll(); var last = '', n = 0, i;
  list.forEach(function (a, k) {
    var acc = { id: 'a' + Date.now().toString(36) + k, type: a.type, name: String(a.name || '').trim(), portal: String(a.portal).trim() };
    if (acc.type === 'xtream') { acc.user = a.user; acc.pass = a.pass; acc.fmt = 'ts'; acc.mac = ''; }
    else { acc.mac = a.mac; acc.sn = ''; acc.dev1 = ''; acc.dev2 = ''; acc.relay = ''; }
    if (!acc.name) acc.name = 'IPTV ' + (S.accounts.length + 1);
    var found = -1; for (i = 0; i < S.accounts.length; i++) if (same(S.accounts[i], acc)) found = i;
    if (found >= 0) { acc.id = S.accounts[found].id; S.accounts[found] = acc; } else S.accounts.push(acc);
    last = acc.id; n++;
  });
  T.saveAccounts(); T.showAccounts(last); toast('✓ ' + t('qrGot') + (n > 1 ? ' (' + n + ')' : ''), 2600);
}
T.openQr = openQr;

/* ---- type from the phone: when a text box is selected with the remote (Samsung TV / Android TV box), a small QR shows next to it.
 *      It opens this TV's own private ntfy page on the phone (the same page every time, so it can stay open there):
 *      whatever is sent from it lands in the selected box (search, account fields, keys). ---- */
var PT = { act: false, inp: null, tok: 0, timer: 0, seen: {}, at: 0, vi: 0, fails: 0, el: null, svg: '', tv: null, touch: false };
function ptTopic() {
  var tp = Store.get('ptTopic', ''); if (/^stv-k-[a-z0-9]{16,}$/.test(tp)) return tp;
  tp = newTopic().replace(/^stv-/, 'stv-k-'); Store.set('ptTopic', tp); return tp;
}
function ptCan() {
  if ((window.PC && window.PC.pc) || PT.touch) return false;
  if (window.ANDROID_APP) {                       // phones and tablets have their own keyboard; TV boxes do not
    if (PT.tv === null) { var ap = window.AndroidPlayer; try { PT.tv = !!(ap && ap.isTv && ap.isTv()); } catch (e) { PT.tv = false; } }
    return PT.tv;
  }
  return true;
}
function ptAllowed() { return ptCan() && Store.get('ptype', true) !== false; }
T.ptCan = ptCan;
/* the box being typed in, or the highlighted one (search boxes / form fields show as .focus) */
function ptTarget() {
  var ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && ae.offsetParent !== null) return ae;
  var scr = $('#s-' + S.screen); return scr ? scr.querySelector('.focus input') : null;
}
function ptStatus(txt, warn) { var e = $('#ptst'); if (e) { e.textContent = txt; e.className = warn ? 'warn' : ''; } }
function ptShow() {
  var el = PT.el; if (!el) { el = PT.el = document.createElement('div'); el.id = 'ptype'; $('#app').appendChild(el); }
  var url = ntfyBase() + '/' + ptTopic();
  if (!PT.svg || PT.url !== url) { PT.url = url; try { PT.svg = window.QRCode.svg(url, 200); } catch (e) { PT.svg = ''; } }
  el.innerHTML = '<div class="ptq">' + PT.svg + '</div><div class="ptt"><b>📱 ' + esc(t('ptT')) + '</b><span>' + esc(t('ptS')) + '</span><i id="ptst">' + esc(t('ptWait')) + '</i></div>';
  el.style.display = 'flex'; PT.act = true; PT.at = Date.now(); PT.fails = 0; PT.tok++; ptPoll(PT.tok, 400);
}
function ptHide() { PT.act = false; PT.tok++; clearTimeout(PT.timer); if (PT.el) PT.el.style.display = 'none'; }
function ptUrls() {
  var base = ntfyBase(), sec = Math.min(900, Math.round((Date.now() - PT.at) / 1000) + 12);   // only what was sent while the QR is up (server-side window, the TV clock does not matter)
  var u = base + '/' + ptTopic() + '/json?poll=1&since=' + sec + 's', l = [u], rel = T.relayOf ? T.relayOf(S.acc || {}) : '';
  if (/^https:/i.test(base)) l.push(u.replace(/^https:/i, 'http:'));
  if (rel) l.push(rel + '/?u=' + encodeURIComponent(u) + '&h=' + encodeURIComponent('{}'));
  return l;
}
function fire(el, n) { var ev; try { ev = new Event(n, { bubbles: true }); } catch (e) { ev = document.createEvent('Event'); ev.initEvent(n, true, true); } el.dispatchEvent(ev); }
function ptApply(text) {
  var inp = PT.inp; if (!inp) return;
  text = String(text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '').slice(0, 300); if (!text) return;
  inp.value = text; fire(inp, 'input'); fire(inp, 'change');
  try { if (document.activeElement === inp) inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
  toast('📱 ' + text, 1800);
}
function ptPoll(tok, wait) {
  clearTimeout(PT.timer);
  PT.timer = setTimeout(function () {
    if (tok !== PT.tok) return;
    var l = ptUrls(), idx = PT.vi < l.length ? PT.vi : 0;
    rawGet(l[idx], 6000).then(function (txt) {
      if (tok !== PT.tok) return;
      var got = null; PT.vi = idx; if (PT.fails) { PT.fails = 0; ptStatus(t('ptWait')); }
      String(txt || '').split('\n').forEach(function (ln) {
        if (!ln) return; var j; try { j = JSON.parse(ln); } catch (e) { return; }
        if (j.event !== 'message' || j.message == null || PT.seen[j.id]) return; PT.seen[j.id] = 1; got = String(j.message);
      });
      if (got !== null) { ptApply(got); ptStatus('✓ ' + t('ptGot')); }
      ptPoll(tok, 1600);
    }, function () {
      if (tok !== PT.tok) return; PT.vi = (idx + 1) % l.length;
      if (++PT.fails > l.length) ptStatus(t('qrNoNet') + ' — ' + Q.err, true);
      ptPoll(tok, 2500);
    });
  }, wait);
}
setInterval(function () {
  var inp = ptAllowed() ? ptTarget() : null;
  PT.inp = inp;
  if (!!inp !== PT.act) { if (inp) ptShow(); else ptHide(); }
}, 450);
// a finger on the screen means a phone / tablet: it has its own keyboard
document.addEventListener('touchstart', function () { if (!PT.touch) { PT.touch = true; ptHide(); } }, true);

T.keys.qr = function (k) {
  if (k === 'back') { stopPoll(); T.showAccounts(); return; }
  if (k === 'yellow') openQr();
};
if (S.screen === 'accounts') T.showAccounts(S.last);
})();
