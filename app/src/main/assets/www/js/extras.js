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
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'ملاحظة: الرسالة تمر عبر خدمة ntfy.sh على رابط سري عشوائي. لا تستخدم الكود إلا لنفسك.'
};
var EN = {
  qrAdd: 'Add from phone', qrTitle: 'Add your account from your phone', qrS1: 'Scan the code with your phone camera and open the link', qrS2: 'Type one line in the message box, in the format shown', qrS3: 'Tap send — the account appears here in seconds',
  qrWait: 'Waiting for your phone…', qrGot: 'Added', qrNew: 'New code', qrBadMsg: 'Could not understand the message. Type: server, username, password', qrNoNet: 'No internet connection',
  minWord: 'min', remain: 'Left', endsAt: 'Ends', origQ: 'Source', qTop: 'Highest quality', qLow: 'Lowest quality', crashed: 'The app closed unexpectedly last time', diagT: 'Crash diagnostics', diagNone: 'None', diagScreen: 'Last unexpected close on screen', diagErr: 'Last error',
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'Note: the message passes through ntfy.sh on a random secret link. Use the code only for yourself.'
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
  stopPoll(); go('qr'); Q.topic = newTopic(); Q.base = ntfyBase(); Q.seen = {}; Q.fails = 0; render();
  poll(Q.tok);
}
function poll(tok) {
  Q.timer = setTimeout(function () {
    if (tok !== Q.tok || S.screen !== 'qr') return;
    T.xhr(Q.base + '/' + Q.topic + '/json?poll=1&since=all', {}, 6000).then(function (txt) {
      if (tok !== Q.tok || S.screen !== 'qr') return;
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
    }, function () { if (tok !== Q.tok || S.screen !== 'qr') return; if (++Q.fails >= 2) setNote(t('qrNoNet'), true); poll(tok); });
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
T.keys.qr = function (k) {
  if (k === 'back') { stopPoll(); T.showAccounts(); return; }
  if (k === 'yellow') openQr();
};
if (S.screen === 'accounts') T.showAccounts(S.last);
})();
