/* Stalker TV — text from your phone (add an account, type in a search / text box), nothing else to run:
 * the TV shows a QR code that opens a small file on GitHub (edited on the phone; GitHub is the default)
 * or a private ntfy.sh topic (the older way); what the phone writes there is read by the TV.
 * An account line looks like "http://host:8080 user pass" or "http://portal/c/ 00:1A:79:..". */
(function () {
'use strict';
var T = window.__tv, $ = T.$, t = T.t, esc = T.esc, Store = T.Store, S = T.S, go = T.go, toast = T.toast;

var AR = {
  qrAdd: 'إضافة من الهاتف', qrTitle: 'أضف حسابك من هاتفك', qrS1: 'صوّر الكود بكاميرا الهاتف وافتح الرابط', qrS2: 'اكتب في خانة الرسالة سطراً واحداً بالصيغة الموضّحة', qrS3: 'اضغط إرسال — يظهر الحساب هنا خلال ثوانٍ',
  qrWait: 'في انتظار الهاتف…', qrGot: 'تمت إضافة', qrNew: 'كود جديد', qrBadMsg: 'لم أفهم الرسالة. اكتب: السيرفر ثم اسم المستخدم ثم كلمة المرور', qrNoNet: 'لا يوجد اتصال بالإنترنت',
  minWord: 'د', remain: 'متبقي', endsAt: 'ينتهي', origQ: 'أصلية', qTop: 'أعلى جودة متاحة', qLow: 'أقل جودة متاحة', crashed: 'أُغلق التطبيق فجأة المرة الماضية', diagT: 'تشخيص الإغلاق المفاجئ', diagNone: 'لا يوجد', diagScreen: 'آخر إغلاق مفاجئ على شاشة', diagErr: 'آخر خطأ',
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'ملاحظة: الرسالة تمر عبر خدمة ntfy.sh على رابط سري عشوائي. لا تستخدم الكود إلا لنفسك.',
  ptT: 'اكتب من موبايلك', ptS: 'صوّر الكود مرة واحدة وسيب الصفحة مفتوحة على الموبايل، اكتب واضغط إرسال', ptWait: 'جاهز — في انتظار الموبايل…', ptGot: 'وصل من الموبايل',
  ptRow: 'الكتابة من الموبايل', ptNote: 'لما تقف على خانة بحث أو كتابة يظهر كود QR صغير: اللي تكتبه على الموبايل يتكتب في الخانة على طول',
  qrS1G: 'صوّر الكود بالموبايل — هيفتح ملف على GitHub (لازم تكون مسجّل دخول؛ لو فتح تطبيق GitHub افتحه في المتصفح)', qrS2G: 'اكتب الحساب في سطر جديد (أو مكان القديم) بالشكل اللي تحت', qrS3G: 'اضغط Commit changes — الحساب يظهر هنا خلال 15 ثانية تقريباً',
  qrNoteG: 'ملحوظة: الملف على GitHub عام وأي حد يقدر يشوفه. امسح اللي فيه بعد ما الحساب يتضاف.',
  ptSG: 'صوّر الكود، اكتب سطر جديد في الملف على GitHub واضغط Commit changes — بيوصل خلال 15 ثانية', ghWait: 'جاهز — بيبص على الملف كل شوية…', ghLook: 'بيبص على ملف GitHub…',
  ghLimit: 'GitHub وصل للحد (60 مرة في الساعة من غير تسجيل دخول) — هيكمل بس أبطأ', ghNoFile: 'الملف مش موجود على GitHub — راجع الإعدادات ← ملف GitHub', ghLeft: 'متبقي من GitHub الساعة دي',
  pmRow: 'الإرسال من الموبايل عن طريق', pmNote: 'GitHub: بتكتب في ملف على GitHub من الموبايل (بياخد لحد 15 ثانية، والملف عام). ntfy: صفحة رسائل أسرع بس ساعات بتتقفل.',
  qrInFile: 'الملف فيه حساب:', qrOkAdd: 'اضغط OK علشان تضيفه', ghRow: 'ملف GitHub', ghRowNote: 'الملف اللي بتكتب فيه من الموبايل: صاحب الحساب/المستودع/الفرع/اسم الملف، أو رابط الملف من GitHub', ghFld: 'المستودع والملف', ghOk: 'الملف موجود'
};
var EN = {
  qrAdd: 'Add from phone', qrTitle: 'Add your account from your phone', qrS1: 'Scan the code with your phone camera and open the link', qrS2: 'Type one line in the message box, in the format shown', qrS3: 'Tap send — the account appears here in seconds',
  qrWait: 'Waiting for your phone…', qrGot: 'Added', qrNew: 'New code', qrBadMsg: 'Could not understand the message. Type: server, username, password', qrNoNet: 'No internet connection',
  minWord: 'min', remain: 'Left', endsAt: 'Ends', origQ: 'Source', qTop: 'Highest quality', qLow: 'Lowest quality', crashed: 'The app closed unexpectedly last time', diagT: 'Crash diagnostics', diagNone: 'None', diagScreen: 'Last unexpected close on screen', diagErr: 'Last error',
  qrFmtX: 'Xtream', qrFmtS: 'Stalker', qrNote: 'Note: the message passes through ntfy.sh on a random secret link. Use the code only for yourself.',
  ptT: 'Type from your phone', ptS: 'Scan once and keep the page open on the phone, type and tap send', ptWait: 'Ready — waiting for your phone…', ptGot: 'Received from the phone',
  ptRow: 'Type from phone', ptNote: 'When a search or text box is selected, a small QR shows: what you type on the phone goes straight into the box',
  qrS1G: 'Scan the code — it opens a file on GitHub (sign in; if the GitHub app opens, use the browser)', qrS2G: 'Write the account on a new line (or over the old one), in the format below', qrS3G: 'Tap Commit changes — the account shows here within about 15 seconds',
  qrNoteG: 'Note: the GitHub file is public, anyone can read it. Clear it after the account is added.',
  ptSG: 'Scan the code, write a new line in the GitHub file and tap Commit changes — arrives within 15 seconds', ghWait: 'Ready — checking the file every few seconds…', ghLook: 'Checking the GitHub file…',
  ghLimit: 'GitHub limit reached (60 checks an hour without signing in) — continuing more slowly', ghNoFile: 'The file is not on GitHub — check Settings → GitHub file', ghLeft: 'GitHub checks left this hour',
  pmRow: 'Text from the phone goes through', pmNote: 'GitHub: you write in a file on GitHub from the phone (up to 15 s, the file is public). ntfy: a faster message page that is sometimes blocked.',
  qrInFile: 'The file holds an account:', qrOkAdd: 'press OK to add it', ghRow: 'GitHub file', ghRowNote: 'The file you write in from the phone: owner/repository/branch/file, or the file link from GitHub', ghFld: 'Repository and file', ghOk: 'File found'
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
function stopPoll() { clearTimeout(Q.timer); Q.tok++; if (Q.gh) { Q.gh(); Q.gh = null; } }

/* ---- the GitHub way: a small file (default: Abdozakaria222/stalkeriptv, branch "phone", phone.txt) edited on the phone in GitHub's
 *      own editor; the TV reads it through the GitHub API. Without signing in GitHub allows 60 reads an hour per home connection,
 *      so the file is read every 12 s at first, then less often, and never while nobody is waiting for the phone.
 *      When that limit is used up the TV reads the public copy (raw.githubusercontent.com: no limit, but up to 5 min behind). ---- */
var GH_DEF = 'Abdozakaria222/stalkeriptv/phone/phone.txt';
function boxMode() { return Store.get('pmode', 'github') === 'ntfy' ? 'ntfy' : 'github'; }
function ghCfg(v) {
  var p = String(v == null ? Store.get('ghBox', GH_DEF) || GH_DEF : v).replace(/^\s+|\s+$/g, '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/[?#].*$/, '').split('/');
  if (/^(edit|blob|tree|raw)$/.test(p[2] || '')) p.splice(2, 1);        // a link copied from GitHub: owner/repo/blob/branch/file
  p = p.filter(function (x) { return x !== ''; });
  if (p.length < 4) return null;
  return { owner: p[0], repo: p[1], branch: p[2], path: p.slice(3).join('/') };
}
function encPath(x) { return String(x).split('/').map(encodeURIComponent).join('/'); }
function ghEditUrl(c) { c = c || ghCfg() || ghCfg(GH_DEF); return 'https://github.com/' + c.owner + '/' + c.repo + '/edit/' + encPath(c.branch) + '/' + encPath(c.path); }
function ghApiUrl(c) { return 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + encPath(c.path) + '?ref=' + encodeURIComponent(c.branch) + '&_=' + Date.now(); }
function ghRawUrl(c) { return 'https://raw.githubusercontent.com/' + c.owner + '/' + c.repo + '/' + encPath(c.branch) + '/' + encPath(c.path) + '?_=' + Date.now(); }
function b64utf8(b) { var bin = atob(String(b || '').replace(/\s+/g, '')); try { return decodeURIComponent(escape(bin)); } catch (e) { return bin; } }
function normTxt(x) { return String(x == null ? '' : x).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, ''); }
/* GET that also returns HTTP errors (the API explains them) and the remaining reads */
function ghGet(url, ms) {
  return new Promise(function (res) {
    var x = new XMLHttpRequest(), done = false;
    function fin(st, txt) { if (done) return; done = true; var rem = null; try { rem = x.getResponseHeader('X-RateLimit-Remaining'); } catch (e) {} res({ status: st, text: txt || '', rem: rem == null || rem === '' ? null : Number(rem) }); }
    try { x.open('GET', url, true); x.timeout = ms || 9000; } catch (e) { fin(0); return; }
    x.onload = function () { fin(x.status, x.responseText); }; x.onerror = function () { fin(0); }; x.ontimeout = function () { fin(-2); };
    try { x.send(); } catch (e2) { fin(0); }
  });
}
/* read the file once: {ok, sha, text, status, rem, why} (the relay is tried when GitHub cannot be reached directly) */
function ghRead(c, raw) {
  var url = raw ? ghRawUrl(c) : ghApiUrl(c), rel = T.relayOf ? T.relayOf(S.acc || {}) : '';
  function parse(r) {
    if (r.status === 200) {
      if (raw) return { ok: true, sha: '', text: normTxt(r.text), status: 200, rem: r.rem };
      var j = null; try { j = JSON.parse(r.text); } catch (e) {}
      if (j && j.content != null) return { ok: true, sha: j.sha || '', text: normTxt(b64utf8(j.content)), status: 200, rem: r.rem };
      return { ok: false, status: 200, why: 'bad reply', rem: r.rem };
    }
    var limited = r.status === 429 || (r.status === 403 && (r.rem === 0 || /rate limit/i.test(r.text)));
    return { ok: false, status: r.status, limited: limited, rem: r.rem, why: r.status === 0 ? 'blocked/TLS' : r.status === -2 ? 'timeout' : 'HTTP ' + r.status };
  }
  return ghGet(url, 9000).then(function (r) {
    if (r.status > 0 || !rel) return parse(r);
    return ghGet(rel + '/?u=' + encodeURIComponent(url) + '&h=' + encodeURIComponent('{}'), 12000).then(parse);
  });
}
/* wait for the phone: the text in the file when the wait starts is the starting point; every later change is handed to onText.
 * Returns stop(). */
function ghWatch(onText, onState, onBase) {
  var c = ghCfg() || ghCfg(GH_DEF), W = { stop: false, base: null, t0: Date.now(), timer: 0, fails: 0, rawUntil: 0 };
  function gap() { var age = Date.now() - W.t0; return age < 180000 ? 12000 : age < 600000 ? 25000 : 60000; }
  function next(ms) { clearTimeout(W.timer); if (!W.stop) W.timer = setTimeout(step, ms); }
  function changed(r) { return W.base && (r.sha && W.base.sha ? r.sha !== W.base.sha : r.text !== W.base.text); }
  function step() {
    if (W.stop) return;
    var raw = Date.now() < W.rawUntil;
    ghRead(c, raw).then(function (r) {
      if (W.stop) return;
      if (r.ok) {
        W.fails = 0;
        if (!W.base) { W.base = { sha: r.sha, text: r.text }; onState(t('ghWait') + (r.rem != null && r.rem < 20 ? ' (' + t('ghLeft') + ': ' + r.rem + ')' : '')); if (onBase) onBase(r.text); }
        else if (changed(r)) { var prev = W.base.text, add = newPart(prev, r.text); W.base = { sha: r.sha || W.base.sha, text: r.text }; if (add) onText(add, r.text); }
        if (r.rem != null && r.rem <= 3) { W.rawUntil = Date.now() + 20 * 60000; onState(t('ghLimit'), true); }
        next(raw ? 30000 : gap()); return;
      }
      if (r.limited) { W.rawUntil = Date.now() + 20 * 60000; onState(t('ghLimit'), true); next(4000); return; }
      if (r.status === 404) { onState(t('ghNoFile'), true); next(30000); return; }
      W.fails++; onState(t('qrNoNet') + ' — ' + (raw ? 'raw ' : 'GitHub ') + r.why, true); next(Math.min(60000, 8000 * W.fails));
    });
  }
  onState(t('ghLook')); step();
  return function () { W.stop = true; clearTimeout(W.timer); };
}
/* what was written since the last read: the lines that were not there before (the phone may replace the text or add a line under it) */
function newPart(prev, text) {
  var old = {}, out = [];
  String(prev || '').split('\n').forEach(function (l) { l = l.replace(/^\s+|\s+$/g, ''); if (l) old[l] = (old[l] || 0) + 1; });
  String(text || '').split('\n').forEach(function (l) { var k = l.replace(/^\s+|\s+$/g, ''); if (!k) return; if (old[k]) old[k]--; else out.push(k); });
  return out.join('\n');
}
/* a file may hold one account (several "label: value" lines) or one account per line */
function accountsIn(text) {
  var lines = String(text || '').split('\n').filter(function (l) { return /\S/.test(l); }), each = lines.map(parseAccount);
  if (lines.length > 1 && each.every(function (a) { return a; })) return each;
  var one = parseAccount(text); return one ? [one] : [];
}
T.phoneBox = {
  mode: boxMode, cfg: ghCfg, def: GH_DEF, editUrl: ghEditUrl,
  label: function () { var c = ghCfg(); return c ? c.owner + '/' + c.repo + ' · ' + c.path : '—'; },
  test: function (v) {
    var c = ghCfg(v); if (!c) return Promise.reject(new Error(t('ghRowNote')));
    return ghRead(c, false).then(function (r) {
      if (r.ok) return t('ghOk') + (r.rem != null ? ' — ' + t('ghLeft') + ': ' + r.rem : '');
      throw new Error(r.status === 404 ? t('ghNoFile') : r.limited ? t('ghLimit') : t('qrNoNet') + ' — ' + r.why);
    });
  }
};

function render() {
  var gh = Q.mode === 'github', url = gh ? ghEditUrl() : Q.base + '/' + Q.topic, svg;
  try { svg = window.QRCode.svg(url, 460); } catch (e) { svg = ''; }
  $('#s-qr').innerHTML = '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="qrbox">' +
    '<div class="qrl"><h1>' + esc(t('qrTitle')) + '</h1>' +
    '<ol><li><b>1</b>' + esc(t(gh ? 'qrS1G' : 'qrS1')) + '</li><li><b>2</b>' + esc(t(gh ? 'qrS2G' : 'qrS2')) + '</li><li><b>3</b>' + esc(t(gh ? 'qrS3G' : 'qrS3')) + '</li></ol>' +
    '<div class="qrfmt"><div><span>' + esc(t('qrFmtX')) + '</span><code>http://host:8080 username password</code></div><div><span>' + esc(t('qrFmtS')) + '</span><code>http://portal.com/c/ 00:1A:79:AB:CD:EF</code></div></div>' +
    '<div class="qrwait" id="qrwait"><i></i><span>' + esc(t('qrWait')) + '</span></div><div class="qrnote">' + esc(t(gh ? 'qrNoteG' : 'qrNote')) + '</div></div>' +
    '<div class="qrr"><div class="qrimg">' + svg + '</div><div class="qrurl">' + esc(url) + '</div></div></div>' +
    T.hintBar([['y', '●', t('qrNew')], ['', '⟲', t('back')]]);
  T.Nav.cur = null;
}
function setNote(txt, warn) { var w = $('#qrwait'); if (!w) return; w.className = 'qrwait' + (warn ? ' warn' : ''); w.lastChild.textContent = txt; }
function openQr() {
  stopPoll(); go('qr'); Q.mode = boxMode(); Q.topic = newTopic(); Q.base = ntfyBase(); Q.seen = {}; Q.fails = 0; Q.vi = 0; render();
  if (Q.mode !== 'github') { poll(Q.tok, true); return; }
  var tok = Q.tok; Q.pending = null;
  Q.gh = ghWatch(function (text) {
    if (tok !== Q.tok || S.screen !== 'qr') return;
    var got = accountsIn(text);
    if (got.length) { received(got); return; }
    setNote(t('qrBadMsg'), true); toast(t('qrBadMsg'), 3200);
  }, function (txt, warn) { if (tok === Q.tok && S.screen === 'qr' && !Q.pending) setNote(txt, warn); },
  function (text) {           // the file already holds an account that is not on this TV (written before the code was opened): OK adds it
    if (tok !== Q.tok) return;
    var acc = accountsIn(text).filter(function (a) { return !S.accounts.some(function (b) { return same(b, a); }); });
    if (acc.length) { Q.pending = acc; setNote(t('qrInFile') + ' ' + (acc[0].portal || '') + ' — ' + t('qrOkAdd')); }
  });
}
function poll(tok, first) {
  var n = pollUrls().list.length;
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
    }, function () { if (tok !== Q.tok || S.screen !== 'qr') return; Q.vi = (idx + 1) % pu.list.length; if (++Q.fails >= pu.list.length) setNote(t('qrNoNet') + ' — ' + Q.err, true); poll(tok); });
  }, first ? 1200 : Q.fails > 0 && Q.fails < n ? 1500 : Q.fails ? 8000 : 5000);   // ntfy allows 60 requests, then about one every 10 s per home connection
}                                                                                   // (more gets "429" and a pause); a failed way is retried at once another way
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
  if (window.PC && window.PC.pc) return false;
  if (window.ANDROID_APP) {                       // phones and tablets have their own keyboard; TV boxes do not
    if (PT.tv === null) { var ap = window.AndroidPlayer; try { PT.tv = !!(ap && ap.isTv && ap.isTv()); } catch (e) { PT.tv = false; } }
    return PT.tv || !PT.touch;                    // many boxes / receivers do not say they are TVs: there it stays until a finger touches the screen
  }
  return !PT.touch;
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
  var gh = boxMode() === 'github', url = gh ? ghEditUrl() : ntfyBase() + '/' + ptTopic();
  if (!PT.svg || PT.url !== url) { PT.url = url; try { PT.svg = window.QRCode.svg(url, 200); } catch (e) { PT.svg = ''; } }
  el.innerHTML = '<div class="ptq">' + PT.svg + '</div><div class="ptt"><b>📱 ' + esc(t('ptT')) + '</b><span>' + esc(t(gh ? 'ptSG' : 'ptS')) + '</span><i id="ptst">' + esc(t('ptWait')) + '</i></div>';
  el.style.display = 'flex'; PT.act = true; PT.at = Date.now(); PT.fails = 0; var tok = ++PT.tok;
  // only once the box stays selected for a moment (walking past a search box must not use up the GitHub / ntfy limits)
  clearTimeout(PT.timer);
  PT.timer = setTimeout(function () {
    if (tok !== PT.tok) return;
    if (!gh) { ptPoll(tok, 0); return; }
    PT.gh = ghWatch(function (add) { if (tok !== PT.tok) return; var ls = add.split('\n'); ptApply(ls[ls.length - 1]); ptStatus('✓ ' + t('ptGot')); },
      function (txt, warn) { if (tok === PT.tok) ptStatus(txt, warn); });
  }, 2000);
}
function ptHide() { PT.act = false; PT.tok++; clearTimeout(PT.timer); if (PT.gh) { PT.gh(); PT.gh = null; } if (PT.el) PT.el.style.display = 'none'; }
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
      ptPoll(tok, Date.now() - PT.at < 180000 ? 5000 : 10000);       // within ntfy's limit (about one request every 10 s per home connection)
    }, function () {
      if (tok !== PT.tok) return; PT.vi = (idx + 1) % l.length;
      if (++PT.fails >= l.length) ptStatus(t('qrNoNet') + ' — ' + Q.err, true);
      ptPoll(tok, PT.fails < l.length ? 1500 : 10000);
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
  if (k === 'ok' && Q.pending && Q.pending.length) { var l = Q.pending; Q.pending = null; received(l); return; }
  if (k === 'yellow') openQr();
};
if (S.screen === 'accounts') T.showAccounts(S.last);
})();
