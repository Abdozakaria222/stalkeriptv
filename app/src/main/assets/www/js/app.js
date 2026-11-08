/* Stalker TV — Samsung Tizen web app (Stalker / Ministra portal client) */
(function () {
'use strict';

/* ======================================================================
 * helpers / storage / i18n
 * ==================================================================== */
var $ = function (s, r) { return (r || document).querySelector(s); };
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function mkErr(c) { var e = new Error(c); e.code = c; return e; }
var Store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

var I18N = {
  ar: {
    app: 'Stalker TV', accounts: 'حساباتي', pick: 'اختر حساباً للبدء أو أضف حساباً جديداً', addAccount: 'إضافة حساب',
    editAccount: 'تعديل الحساب', newAccount: 'حساب جديد', name: 'اسم الحساب', portal: 'رابط البورتال (Host)', mac: 'عنوان MAC',
    advanced: 'إعدادات متقدمة', sn: 'الرقم التسلسلي (SN)', dev1: 'Device ID', dev2: 'Device ID 2', relay: 'رابط الريلاي (اختياري)',
    test: 'اختبار الاتصال', save: 'حفظ', cancel: 'إلغاء', del: 'حذف', delSure: 'اضغط مرة أخرى للتأكيد', lang: 'English', last: 'آخر استخدام',
    connecting: 'جاري الاتصال بالسيرفر…', loadingCh: 'جاري تحميل القنوات…', retry: 'إعادة المحاولة', back: 'رجوع',
    all: 'كل القنوات', favs: 'المفضلة', search: 'بحث', searchPh: 'ابحث عن قناة…', noCh: 'لا توجد قنوات هنا', noEpg: 'لا يوجد دليل برامج لهذه القناة',
    now: 'الآن', next: 'التالي', tuning: 'جاري فتح القناة…', buffering: 'تحميل البث…', playErr: 'تعذّر تشغيل هذه القناة', pickCh: 'اختر قناة للتشغيل',
    chan: 'قناة', open: 'فتح', edit: 'تعديل', play: 'تشغيل', full: 'ملء الشاشة', fav: 'مفضلة', accts: 'الحسابات', reload: 'تحديث', ch: 'القنوات',
    zap: 'تغيير القناة', list: 'القائمة', exit: 'خروج',
    errNet: 'تعذّر الوصول للسيرفر. تأكد من الرابط ومن اتصال الإنترنت.',
    errParse: 'رد غير متوقع من البورتال. تأكد من الرابط والـ MAC. ولو البيانات صحيحة فالشاشة غالباً بتمنع إرسال الـ MAC: شغّل الريلاي وحط عنوانه في إعدادات الاتصال.',
    errAuth: 'السيرفر رفض الحساب. تأكد أن الـ MAC مفعّل.', errEmpty: 'الحساب اتصل بنجاح لكن مفيش قنوات فيه.',
    badMac: 'عنوان MAC لازم يكون بالشكل 00:1A:79:XX:XX:XX', needPortal: 'اكتب رابط البورتال', okConn: 'تم الاتصال بنجاح', expires: 'ينتهي الاشتراك', saved: 'تم الحفظ', deleted: 'تم الحذف',
    testing: 'جاري الاختبار…',
    typeStalker: 'Stalker (MAC)', typeXtream: 'Xtream Codes', server: 'رابط السيرفر', user: 'اسم المستخدم', pass: 'كلمة المرور', fmt: 'صيغة البث',
    needServer: 'اكتب رابط السيرفر', needUser: 'اكتب اسم المستخدم وكلمة المرور', viaDirect: 'اتصال مباشر', viaRelay: 'عبر الريلاي',
    settings: 'إعدادات الاتصال', xmltvF: 'رابط دليل البرامج XMLTV (اختياري)', xmltvNote: 'لو القناة ما فيهاش دليل من السيرفر، التطبيق يستخدم رابط XMLTV زي الإنيجما. لازم ملف XML عادي (مش .gz). مع Xtream يستخدم دليل السيرفر تلقائياً.', relayGlobal: 'رابط الريلاي (لكل حسابات Stalker)', relayNote: 'الشاشات غالباً بتمنع إرسال الـ MAC من التطبيق. لو حصل كده، التطبيق بيستخدم الريلاي تلقائياً ويفتكر الطريقة اللي نجحت. حسابات Xtream مش محتاجة ريلاي.',
    relayOk: 'الريلاي شغّال', relayBad: 'مفيش رد من الريلاي. تأكد أنه شغّال وأن العنوان صح.', relaySet: 'إعداد الريلاي', status: 'الحالة', conns: 'اتصالات',
    badAuth: 'اسم المستخدم أو كلمة المرور غلط، أو الحساب موقوف.',
    errParseRelay: 'البورتال رفض الطلب حتى عبر الريلاي. راجع الرابط والـ MAC.'
  },
  en: {
    app: 'Stalker TV', accounts: 'My accounts', pick: 'Pick an account to start, or add a new one', addAccount: 'Add account',
    editAccount: 'Edit account', newAccount: 'New account', name: 'Account name', portal: 'Portal URL (Host)', mac: 'MAC address',
    advanced: 'Advanced settings', sn: 'Serial number (SN)', dev1: 'Device ID', dev2: 'Device ID 2', relay: 'Relay URL (optional)',
    test: 'Test connection', save: 'Save', cancel: 'Cancel', del: 'Delete', delSure: 'Press again to confirm', lang: 'عربي', last: 'Last used',
    connecting: 'Connecting to server…', loadingCh: 'Loading channels…', retry: 'Retry', back: 'Back',
    all: 'All channels', favs: 'Favorites', search: 'Search', searchPh: 'Search channels…', noCh: 'No channels here', noEpg: 'No program guide for this channel',
    now: 'NOW', next: 'NEXT', tuning: 'Opening channel…', buffering: 'Buffering…', playErr: 'Could not play this channel', pickCh: 'Pick a channel to play',
    chan: 'Channel', open: 'Open', edit: 'Edit', play: 'Play', full: 'Fullscreen', fav: 'Favorite', accts: 'Accounts', reload: 'Reload', ch: 'Channels',
    zap: 'Change channel', list: 'List', exit: 'Exit',
    errNet: 'Could not reach the server. Check the URL and your internet connection.',
    errParse: 'Unexpected reply from the portal. Check the URL and MAC. If they are right, the TV is probably blocking the MAC: run the relay and set its address in Connection settings.',
    errAuth: 'The server rejected this account. Make sure the MAC is active.', errEmpty: 'Connected, but this account has no channels.',
    badMac: 'MAC must look like 00:1A:79:XX:XX:XX', needPortal: 'Enter the portal URL', okConn: 'Connected successfully', expires: 'Subscription ends', saved: 'Saved', deleted: 'Deleted',
    testing: 'Testing…',
    typeStalker: 'Stalker (MAC)', typeXtream: 'Xtream Codes', server: 'Server URL', user: 'Username', pass: 'Password', fmt: 'Stream format',
    needServer: 'Enter the server URL', needUser: 'Enter username and password', viaDirect: 'Direct connection', viaRelay: 'Via relay',
    settings: 'Connection settings', xmltvF: 'XMLTV guide URL (optional)', xmltvNote: 'When the server has no guide for a channel the app falls back to an XMLTV file, like Enigma. It must be a plain .xml file (not .gz). Xtream uses the server guide automatically.', relayGlobal: 'Relay URL (for all Stalker accounts)', relayNote: 'TVs usually block apps from sending the MAC. When that happens the app switches to the relay automatically and remembers what worked. Xtream accounts do not need a relay.',
    relayOk: 'Relay is running', relayBad: 'No reply from the relay. Check it is running and the address is right.', relaySet: 'Relay setup', status: 'Status', conns: 'connections',
    badAuth: 'Wrong username or password, or the account is disabled.',
    errParseRelay: 'The portal rejected the request even through the relay. Check the URL and MAC.'
  }
};
var lang = Store.get('lang', 'ar');
function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.ar[k] || k; }
function applyLang() { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }

/* ======================================================================
 * scaling (TV runs at 1920x1080; scale only matters in a desktop browser)
 * ==================================================================== */
var app = $('#app'), SCALE = 1;
function fit() {
  var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  if (Math.abs(s - 1) < 0.001) { s = 1; app.style.left = '0'; app.style.top = '0'; }
  else { app.style.left = Math.round((window.innerWidth - 1920 * s) / 2) + 'px'; app.style.top = Math.round((window.innerHeight - 1080 * s) / 2) + 'px'; }
  SCALE = s; app.style.transform = s === 1 ? 'none' : 'scale(' + s + ')';
}
window.addEventListener('resize', fit); fit();
if (window.webapis && window.webapis.avplay) document.documentElement.classList.add('tv');

/* ======================================================================
 * Stalker portal client
 * ==================================================================== */
var UA = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function xhr(url, headers, timeout) {
  return new Promise(function (res, rej) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = timeout || 20000;
    for (var k in headers) { try { x.setRequestHeader(k, headers[k]); } catch (e) {} }
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) res(x.responseText);
      else rej(mkErr(x.status === 401 || x.status === 403 ? 'auth' : 'net'));
    };
    x.onerror = x.ontimeout = function () { rej(mkErr('net')); };
    x.send();
  });
}
function normRelay(r) { r = String(r || '').trim(); if (!r) return ''; if (!/^https?:\/\//i.test(r)) r = 'http://' + r; return r.replace(/\/+$/, ''); }

function Portal(acc) { this.acc = acc; this.api = ''; this.token = ''; this.logoBase = ''; this.profile = null; this.via = 'direct'; }
Portal.prototype.candidates = function () {
  var p = String(this.acc.portal || '').trim();
  if (!/^https?:\/\//i.test(p)) p = 'http://' + p;
  p = p.replace(/\/+$/, '');
  var m = p.match(/^(https?:\/\/[^\/]+)(.*)$/i), origin = m[1], path = m[2] || '', c = [];
  var root = path.replace(/\/(c|portal\.php|server\/load\.php)$/i, '').replace(/\/+$/, '');
  var base = origin + root;
  if (/\.php$/i.test(path)) c.push(origin + path);
  if (/stalker_portal/i.test(root)) { c.push(base + '/server/load.php'); c.push(origin + '/portal.php'); }
  else { c.push(base + '/portal.php'); c.push(base + '/server/load.php'); c.push(base + '/stalker_portal/server/load.php'); }
  this.logoBase = (/stalker_portal/i.test(root) ? base : base + '/stalker_portal') + '/misc/logos/320/';
  this.root = base + '/';
  var seen = {}; return c.filter(function (u) { if (seen[u]) return false; seen[u] = 1; return true; });
};
Portal.prototype.headers = function (auth) {
  var h = { 'Cookie': 'mac=' + this.acc.mac + '; stb_lang=en; timezone=GMT', 'User-Agent': UA, 'X-User-Agent': 'Model: MAG250; Link: WiFi', 'Accept': '*/*' };
  if (auth && this.token) h['Authorization'] = 'Bearer ' + this.token;
  return h;
};
Portal.prototype.call = function (type, action, params, auth, timeout) {
  var q = 'type=' + type + '&action=' + action, k;
  for (k in (params || {})) q += '&' + k + '=' + encodeURIComponent(params[k]);
  q += '&JsHttpRequest=1-xml';
  var url = this.api + (this.api.indexOf('?') < 0 ? '?' : '&') + q;
  var hd = this.headers(auth), rel = this.via === 'relay' ? this.relayUrl() : '';
  if (rel) { url = rel + '/?u=' + encodeURIComponent(url) + '&h=' + encodeURIComponent(JSON.stringify(hd)); hd = {}; }
  return xhr(url, hd, timeout).then(function (txt) {
    var j; try { j = JSON.parse(String(txt).replace(/^﻿/, '')); } catch (e) { throw mkErr('parse'); }
    if (!j || typeof j !== 'object') throw mkErr('parse');
    return j.js;
  });
};
var ERR_RANK = { net: 0, http: 0, parse: 1, auth: 2 };
function betterErr(a, b) { if (!a) return b; return (ERR_RANK[b.code] || 0) > (ERR_RANK[a.code] || 0) ? b : a; }
Portal.prototype.connectOnce = function () {
  var self = this, cands = this.candidates(), i = 0, lastErr = null, a = this.acc;
  function next() {
    if (i >= cands.length) return Promise.reject(lastErr || mkErr('net'));
    self.api = cands[i++];
    return self.call('stb', 'handshake', { token: '', prehash: '' }, false, 8000).then(function (js) {
      if (!js || !js.token) throw mkErr('parse');
      self.token = js.token;
      return self.call('stb', 'get_profile', {
        hd: 1, ver: 'ImageDescription: 0.2.18-r14-pub-250; ImageDate: Fri Jan 15 15:20:44 EET 2016; PORTAL version: 5.6.1; API Version: JS API version: 328; STB API version: 134; Player Engine version: 0x566',
        num_banks: 2, sn: a.sn || '', stb_type: 'MAG250', client_type: 'STB', image_version: 218, video_out: 'hdmi',
        device_id: a.dev1 || '', device_id2: a.dev2 || '', signature: '', auth_second_step: 1, hw_version: '1.7-BD-00', not_valid_token: 0,
        metrics: JSON.stringify({ mac: a.mac, sn: a.sn || '', type: 'STB', model: 'MAG250', uid: '' }), hw_version_2: '', api_signature: 262, prehash: ''
      }, true).catch(function () { return null; });
    }).then(function (profile) { self.profile = profile; return self; })
      .catch(function (e) { lastErr = betterErr(lastErr, e); return next(); });
  }
  return next();
};
function relayOf(acc) { return normRelay(acc.relay || Store.get('relay', '')); }
function connectModes(self) {
  var rel = relayOf(self.acc), modes = rel ? (self.acc.via === 'relay' ? ['relay', 'direct'] : ['direct', 'relay']) : ['direct'], i = 0, best = null;
  function nxt() {
    if (i >= modes.length) return Promise.reject(best || mkErr('net'));
    self.via = modes[i++];
    return self.connectOnce().then(function (r) {
      if (self.acc.via !== self.via) { self.acc.via = self.via; if (!self.acc._tmp) saveAccounts(); }
      return r;
    }, function (e) { best = betterErr(best, e); if (modes.length > 1 && best.code === 'parse') best.relayTried = true; return nxt(); });
  }
  return nxt();
}
Portal.prototype.relayUrl = function () { return relayOf(this.acc); };
Portal.prototype.connect = function () { return connectModes(this); };
Portal.prototype.accountInfo = function () {
  return this.call('account_info', 'get_main_info', {}, true).catch(function () { return null; });
};
Portal.prototype.genres = function () {
  return this.call('itv', 'get_genres', {}, true).then(function (js) {
    var out = []; (js || []).forEach(function (g) { if (g && g.id != null && String(g.id) !== '*') out.push({ id: String(g.id), title: g.title || g.name || String(g.id) }); }); return out;
  });
};
Portal.prototype.channels = function () {
  var self = this;
  return this.call('itv', 'get_all_channels', {}, true).then(function (js) {
    var d = js && (js.data || js);
    if (d && d.length) return d;
    return self.pagedChannels();
  }).catch(function (e) { if (e && e.code === 'auth') throw e; return self.pagedChannels(); });
};
Portal.prototype.pagedChannels = function () {
  var self = this, all = [];
  function page(p) {
    return self.call('itv', 'get_ordered_list', { genre: '*', force_ch_link_check: '', fav: 0, sortby: 'number', hd: 0, p: p }, true).then(function (js) {
      var d = (js && js.data) || [];
      all = all.concat(d);
      var total = js ? Number(js.total_items || 0) : 0;
      if (d.length && all.length < total && p < 300) return page(p + 1);
      return all;
    });
  }
  return page(1);
};
Portal.prototype.normalize = function (raw) {
  var self = this, out = [];
  raw.forEach(function (c, i) {
    if (!c || !c.name) return;
    var logo = c.logo || c.logo_url || '';
    if (logo && !/^(https?:)?\/\//i.test(logo)) logo = self.logoBase + logo.replace(/^\/+/, '');
    out.push({ id: String(c.id != null ? c.id : i), name: String(c.name).replace(/^\s+|\s+$/g, ''), number: Number(c.number) || (i + 1), cmd: c.cmd || '', epg: String(c.xmltv_id || ''), logo: logo, genre: String(c.tv_genre_id != null ? c.tv_genre_id : '') });
  });
  out.sort(function (a, b) { return a.number - b.number; });
  return out;
};
function cleanCmd(c) { return String(c || '').replace(/^\s+|\s+$/g, '').replace(/^(ffmpeg|ffrt\d*|auto|rtp)\s+/i, ''); }
Portal.prototype.link = function (ch) {
  return this.call('itv', 'create_link', { cmd: ch.cmd, series: '', forced_storage: 0, disable_ad: 0, download: 0, force_ch_link_check: 0 }, true)
    .then(function (js) { var c = js && js.cmd; return cleanCmd(c || ch.cmd); })
    .catch(function () { return cleanCmd(ch.cmd); });
};
Portal.prototype.epg = function (ch) {
  return this.call('itv', 'get_short_epg', { ch_id: ch.id, size: 3 }, true).then(function (js) {
    var arr = js && (js.data || js); if (!arr || !arr.length) return [];
    return arr.map(function (e) { return { name: e.name || '', start: Number(e.start_timestamp) || 0, stop: Number(e.stop_timestamp) || 0, desc: e.descr || e.description || '' }; });
  }).catch(function () { return []; });
};


/* ---------- Xtream Codes client ---------- */
function b64(x) {
  try { var bin = atob(String(x || '')), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(a); }
  catch (e) { try { return decodeURIComponent(escape(atob(String(x || '')))); } catch (e2) { return String(x || ''); } }
}
function pad2(n) { return ('0' + n).slice(-2); }
function Xtream(acc) { this.acc = acc; this.base = ''; this.via = 'direct'; this.info = null; }
Xtream.prototype.relayUrl = function () { return relayOf(this.acc); };
Xtream.prototype.req = function (action, params, timeout) {
  var a = this.acc, q = 'username=' + encodeURIComponent(a.user) + '&password=' + encodeURIComponent(a.pass), k;
  if (action) q += '&action=' + action;
  for (k in (params || {})) q += '&' + k + '=' + encodeURIComponent(params[k]);
  var url = this.base + '/player_api.php?' + q, rel = this.via === 'relay' ? this.relayUrl() : '';
  if (rel) url = rel + '/?u=' + encodeURIComponent(url) + '&h=' + encodeURIComponent('{}');
  return xhr(url, {}, timeout || 30000).then(function (txt) {
    var j; try { j = JSON.parse(String(txt).replace(/^﻿/, '')); } catch (e) { throw mkErr('parse'); } return j;
  });
};
Xtream.prototype.connectOnce = function () {
  var self = this, p = String(this.acc.portal || '').trim();
  if (!/^https?:\/\//i.test(p)) p = 'http://' + p;
  this.base = p.replace(/\/(player_api|get|panel_api|xmltv)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\/+$/, '');
  return this.req('', null, 10000).then(function (j) {
    var u = j && j.user_info;
    if (!u || String(u.auth) === '0' || String(u.status || '').toLowerCase() === 'disabled') { var e = mkErr('auth'); e.xt = true; throw e; }
    self.info = j; return self;
  });
};
Xtream.prototype.connect = function () { return connectModes(this); };
Xtream.prototype.accountInfo = function () {
  var u = this.info && this.info.user_info; if (!u) return Promise.resolve(null);
  var d = u.exp_date ? new Date(Number(u.exp_date) * 1000) : null;
  return Promise.resolve({ end_date: d ? d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : '', status: u.status, max: u.max_connections });
};
Xtream.prototype.genres = function () {
  return this.req('get_live_categories').then(function (arr) {
    var out = []; (Array.isArray(arr) ? arr : []).forEach(function (c) { if (c && c.category_id != null) out.push({ id: String(c.category_id), title: c.category_name || String(c.category_id) }); }); return out;
  });
};
Xtream.prototype.channels = function () { return this.req('get_live_streams', null, 90000).then(function (arr) { if (!Array.isArray(arr)) throw mkErr('parse'); return arr; }); };
Xtream.prototype.normalize = function (raw) {
  var out = [];
  (raw || []).forEach(function (c, i) {
    if (!c || !c.name) return;
    out.push({ id: String(c.stream_id), name: String(c.name).replace(/^\s+|\s+$/g, ''), number: Number(c.num) || (i + 1), cmd: String(c.stream_id), epg: String(c.epg_channel_id || ''),
      logo: /^https?:\/\//i.test(c.stream_icon || '') ? c.stream_icon : '', genre: String(c.category_id != null ? c.category_id : '') });
  });
  out.sort(function (a, b) { return a.number - b.number; });
  return out;
};
Xtream.prototype.link = function (ch) {
  var a = this.acc;
  return Promise.resolve(this.base + '/live/' + encodeURIComponent(a.user) + '/' + encodeURIComponent(a.pass) + '/' + ch.id + '.' + (a.fmt === 'm3u8' ? 'm3u8' : 'ts'));
};
Xtream.prototype.epg = function (ch) {
  return this.req('get_short_epg', { stream_id: ch.id, limit: 3 }).then(function (j) {
    return ((j && j.epg_listings) || []).map(function (e) { return { name: b64(e.title), start: Number(e.start_timestamp) || 0, stop: Number(e.stop_timestamp) || 0, desc: b64(e.description || '') }; });
  }).catch(function () { return []; });
};
function makeClient(acc) { return acc.type === 'xtream' ? new Xtream(acc) : new Portal(acc); }

/* ======================================================================
 * Player (Samsung AVPlay, with <video> fallback)
 * ==================================================================== */
var stage = $('#stage'), vid = $('#vid'), stageMsgEl = $('#stageMsg');
var PREV = { x: 60, y: 110, w: 680, h: 383 }, FULL = { x: 0, y: 0, w: 1920, h: 1080 };

/* ---- user preferences (Netflix-style settings) ---- */
var Prefs = Store.get('prefs', null) || {};
(function (d) { for (var k in d) if (Prefs[k] === undefined) Prefs[k] = d[k]; })({ quality: 'auto', autonext: true, resume: true, fast: true, subs: true, subLang: 'ar', subBoth: false, subSize: 'm', aspect: 'fit', perf: true });
function savePrefs() { Store.set('prefs', Prefs); document.documentElement.classList.toggle('perf', !!Prefs.perf); }
document.documentElement.classList.toggle('perf', !!Prefs.perf);
var ASPR = { fit: 0, fill: 0, zoom: 0, '169': 16 / 9, '43': 4 / 3, '219': 21 / 9 };

/* ---- HLS quality (variant playlists) ---- */
var Quality = {
  cache: {},
  isHls: function (u) { return /\.m3u8(\?|#|$)/i.test(u || ''); },
  parse: function (txt, base) {
    var lines = String(txt).split(/\r?\n/), out = [], i, j;
    for (i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('#EXT-X-STREAM-INF') !== 0) continue;
      var bw = (lines[i].match(/BANDWIDTH=(\d+)/) || [0, 0])[1], res = lines[i].match(/RESOLUTION=(\d+)x(\d+)/), uri = '';
      for (j = i + 1; j < lines.length; j++) { var l = lines[j].replace(/^\s+|\s+$/g, ''); if (l && l.charAt(0) !== '#') { uri = l; break; } }
      if (!uri) continue;
      var u; try { u = new URL(uri, base).href; } catch (e) { u = uri; }
      out.push({ bw: Number(bw), w: res ? Number(res[1]) : 0, h: res ? Number(res[2]) : 0, url: u });
    }
    out.sort(function (a, b) { return b.bw - a.bw; });
    return out;
  },
  load: function (url) {
    var self = this;
    if (!this.isHls(url)) return Promise.resolve([]);
    if (this.cache[url]) return Promise.resolve(this.cache[url]);
    return xhr(url, {}, 8000).then(function (txt) { var v = self.parse(txt, url); self.cache[url] = v; return v; }).catch(function () { return []; });
  },
  choose: function (vs, pref) {
    if (!vs.length || pref === 'auto') return null;
    var tgt = Number(pref), withH = vs.filter(function (v) { return v.h; });
    if (withH.length) { var cand = withH.filter(function (v) { return v.h <= tgt; }); return cand.length ? cand[0] : withH[withH.length - 1]; }
    return vs[tgt >= 1080 ? 0 : tgt >= 720 ? Math.floor((vs.length - 1) / 2) : vs.length - 1];
  },
  label: function (v) { return v.h ? v.h + 'p' : Math.round(v.bw / 1000) + ' kbps'; }
};

/* ---- Player (Samsung AVPlay, with <video> fallback) ---- */
var Player = {
  av: !!(window.webapis && window.webapis.avplay), gen: 0, rect: PREV, active: false,
  h: null, url: '', master: '', variant: '', ms: 0, dur: 0, paused: false, onTime: null,
  setRect: function (r) { this.rect = r; this.applyAspect(); },
  /* screen fit: fit / stretch / zoom(crop) / forced 16:9, 4:3, 21:9 — AVPlay display mode or <video> object-fit */
  applyAspect: function () {
    var r = this.rect, a = Prefs.aspect || 'fit', ar = ASPR[a], x = r.x, y = r.y, w = r.w, h = r.h, fw, fh;
    if (ar) { fw = Math.min(r.w, r.h * ar); fh = fw / ar; w = Math.round(fw); h = Math.round(fh); x = r.x + Math.round((r.w - w) / 2); y = r.y + Math.round((r.h - h) / 2); }
    if (this.av) {
      if (!this.active) return;
      var av = webapis.avplay, m = a === 'fill' || ar ? 'FULL_SCREEN' : a === 'zoom' ? 'CROPPED_FULL' : 'AUTO_ASPECT_RATIO';
      try { av.setDisplayRect(x, y, w, h); } catch (e) {}
      try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_' + m); } catch (e1) { try { av.setDisplayMethod('PLAYER_DISPLAY_METHOD_' + m); } catch (e2) { try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e3) {} } }
    } else {
      vid.style.objectFit = a === 'fill' || ar ? 'fill' : a === 'zoom' ? 'cover' : 'contain';
      vid.style.left = (x - r.x) + 'px'; vid.style.top = (y - r.y) + 'px'; vid.style.width = w + 'px'; vid.style.height = h + 'px';
    }
  },
  stop: function () {
    this.gen++; this.active = false; this.onTime = null; this.onSub = null; this.paused = false;
    if (this.av) { try { webapis.avplay.stop(); } catch (e) {} try { webapis.avplay.close(); } catch (e2) {} }
    else { vid.onplaying = vid.onwaiting = vid.onerror = vid.onloadedmetadata = vid.ontimeupdate = vid.onended = null; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e3) {} }
  },
  play: function (url, h, opts) {
    opts = opts || {};
    var keepTime = opts.onTime || null, keepSub = opts.onSub || null;
    this.stop(); this.onTime = keepTime; this.onSub = keepSub;
    var gen = this.gen, self = this;
    this.h = h; this.master = opts.master || url; this.ms = opts.startMs || 0; this.dur = 0; this.variant = opts.variant || '';
    h.onState('buffering');
    if (!opts.exact && Prefs.quality !== 'auto' && Quality.isHls(url)) {
      Quality.load(url).then(function (vs) {
        if (gen !== self.gen) return;
        var c = Quality.choose(vs, Prefs.quality); self.variant = c ? c.url : '';
        self._open(c ? c.url : url, h, opts, gen);
      });
      return;
    }
    this._open(url, h, opts, gen);
  },
  _open: function (url, h, opts, gen) {
    var self = this, r = this.rect; this.url = url;
    function ok() { return gen === self.gen; }
    function end() { if (!ok()) return; if (h.onEnd) h.onEnd(); else h.onError('ended'); }
    if (this.av) {
      try {
        var a = webapis.avplay; a.open(url); this.active = true;
        try {
          a.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', Prefs.fast ? 1 : 4);
          a.setBufferingParam('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', Prefs.fast ? 2 : 6);
        } catch (e) {}
        a.setListener({
          onbufferingstart: function () { if (ok()) h.onState('buffering'); },
          onbufferingcomplete: function () { if (ok()) h.onState('playing'); },
          onstreamcompleted: end,
          onerror: function (e) { if (ok()) h.onError(e); },
          oncurrentplaytime: function (ms) { if (!ok()) return; self.ms = ms; if (self.onTime) self.onTime(ms); },
          onevent: function () {}, onsubtitlechange: function (dur, text) { if (ok() && self.onSub) self.onSub(text, dur); }, ondrmevent: function () {}
        });
        a.setDisplayRect(r.x, r.y, r.w, r.h); self.applyAspect();
        a.prepareAsync(function () {
          if (!ok()) return;
          try {
            self.dur = a.getDuration() || 0; a.play();
            if (opts.startMs > 5000) { try { a.seekTo(opts.startMs); } catch (e) {} }
            h.onState('playing'); if (h.onReady) h.onReady();
          } catch (e) { h.onError(e); }
        }, function (e) { if (ok()) h.onError(e); });
      } catch (e) { h.onError(e); }
    } else {
      vid.onplaying = function () { if (ok()) h.onState('playing'); };
      vid.onwaiting = function () { if (ok()) h.onState('buffering'); };
      vid.onerror = function () { if (ok()) h.onError(vid.error); };
      vid.onended = end;
      vid.onloadedmetadata = function () {
        if (!ok()) return; self.dur = (isFinite(vid.duration) ? vid.duration : 0) * 1000;
        if (opts.startMs > 5000) { try { vid.currentTime = opts.startMs / 1000; } catch (e) {} }
        self._hookTextTracks();
        if (h.onReady) h.onReady();
      };
      vid.ontimeupdate = function () { if (!ok()) return; self.ms = vid.currentTime * 1000; if (self.onTime) self.onTime(self.ms); };
      self.applyAspect(); vid.src = url; var p = vid.play(); if (p && p.catch) p.catch(function () {});
    }
  },
  pause: function () { this.paused = true; if (this.av) { try { webapis.avplay.pause(); } catch (e) {} } else { try { vid.pause(); } catch (e2) {} } },
  resume: function () { this.paused = false; if (this.av) { try { webapis.avplay.play(); } catch (e) {} } else { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } },
  toggle: function () { if (this.paused) this.resume(); else this.pause(); return this.paused; },
  seek: function (ms) {
    var max = this.dur ? this.dur - 1500 : ms; ms = Math.max(0, Math.min(ms, max)); this.ms = ms;
    if (this.av) { try { webapis.avplay.seekTo(ms); } catch (e) {} } else { try { vid.currentTime = ms / 1000; } catch (e2) {} }
  },
  tracks: function (type) {
    var out = [];
    if (!this.av) {
      if (type === 'TEXT') { try { for (var q = 0; q < vid.textTracks.length; q++) out.push({ index: q, label: vid.textTracks[q].language || vid.textTracks[q].label || ('#' + (q + 1)) }); } catch (e) {} }
      return out;
    }
    try {
      (webapis.avplay.getTotalTrackInfo() || []).forEach(function (x) {
        if (x.type !== type) return; var lg = ''; try { var ei = JSON.parse(x.extra_info || '{}'); lg = ei.language || ei.track_lang || ''; } catch (e) {}
        out.push({ index: x.index, label: lg || ('#' + (out.length + 1)) });
      });
    } catch (e) {}
    return out;
  },
  selectTrack: function (type, idx) {
    if (!this.av) { if (type === 'TEXT') { try { for (var q = 0; q < vid.textTracks.length; q++) vid.textTracks[q].mode = q === idx ? 'hidden' : 'disabled'; } catch (e) {} this._hookTextTracks(idx); } return; }
    try { webapis.avplay.setSelectTrack(type, idx); } catch (e) {}
  },
  _hookTextTracks: function (only) {
    var self = this, gen = this.gen;
    try {
      for (var q = 0; q < vid.textTracks.length; q++) if (only == null || q === only) (function (tr) {
        tr.mode = 'hidden';
        tr.oncuechange = function () {
          if (gen !== self.gen || !self.onSub || tr.mode === 'disabled') return;
          var c = tr.activeCues, txt = '', d = 0; if (c && c.length) { txt = [].slice.call(c).map(function (x) { return x.text; }).join('\n'); d = (c[0].endTime - vid.currentTime) * 1000; }
          self.onSub(txt, d);
        };
      })(vid.textTracks[q]);
    } catch (e) {}
  },
  setVariant: function (url) {
    var h = this.h, master = this.master, ms = this.ms, ot = this.onTime;
    this.play(url || master, h, { startMs: ms, exact: true, master: master, variant: url || '', onTime: ot });
  }
};
function stageMsg(kind, text) {
  if (!kind) { stageMsgEl.innerHTML = ''; stageMsgEl.className = ''; return; }
  stageMsgEl.className = kind;
  stageMsgEl.innerHTML = (kind === 'load' ? '<div class="sp"></div>' : '') + '<div>' + esc(text) + '</div>';
}

/* ======================================================================
 * state
 * ==================================================================== */
var S = {
  screen: '', accounts: Store.get('accounts', []), last: Store.get('lastAcc', ''),
  acc: null, portal: null, channels: [], genres: [], cats: [], catIdx: 0, list: [], chIdx: 0, query: '', zone: 'chan',
  favs: {}, playing: null, epg: {}, loadTok: 0, numBuf: ''
};
function saveAccounts() { Store.set('accounts', S.accounts); }

var SCREENS = ['accounts', 'form', 'loading', 'browse', 'full', 'hub', 'rows', 'detail', 'settings', 'vod', 'qr'];
var FULLSCR = { full: 1, vod: 1 }, VIDSCR = { browse: 1, full: 1, vod: 1 };
function go(name) {
  S.screen = name; Store.set('run', { t: Date.now(), screen: name });
  SCREENS.forEach(function (n) { var e = $('#s-' + n); if (e) e.classList.toggle('on', n === name); });
  var vis = !!VIDSCR[name];
  document.body.classList.toggle('vid', vis); document.body.classList.toggle('e2', name === 'browse');
  stage.style.display = vis ? 'block' : 'none';
  var r = FULLSCR[name] ? FULL : PREV;
  stage.className = FULLSCR[name] ? 'full' : '';
  stage.style.left = r.x + 'px'; stage.style.top = r.y + 'px'; stage.style.width = r.w + 'px'; stage.style.height = r.h + 'px';
  Player.setRect(r);
}
function toast(msg, ms) {
  var e = $('#toast'); e.textContent = msg; e.style.display = 'block'; e.style.bottom = S.screen === 'full' ? '340px' : ''; clearTimeout(toast.t);
  toast.t = setTimeout(function () { e.style.display = 'none'; }, ms || 2600);
}

/* ======================================================================
 * generic spatial navigation for static screens
 * ==================================================================== */
var Nav = {
  cur: null, root: null,
  list: function () { return [].slice.call(this.root.querySelectorAll('.f')); },
  set: function (e) { if (this.cur) this.cur.classList.remove('focus'); this.cur = e || null; if (e) e.classList.add('focus'); },
  init: function (root, pref) { this.root = root; var l = this.list(); this.set((pref && root.querySelector(pref)) || l[0]); },
  move: function (dir) {
    var c = this.cur; if (!c) { this.init(this.root); return; }
    var r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bs = 1e9;
    this.list().forEach(function (e) {
      if (e === c) return;
      var q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy, p, s;
      if (dir === 'left') { if (dx > -4) return; p = -dx; s = Math.abs(dy); }
      else if (dir === 'right') { if (dx < 4) return; p = dx; s = Math.abs(dy); }
      else if (dir === 'up') { if (dy > -4) return; p = -dy; s = Math.abs(dx); }
      else { if (dy < 4) return; p = dy; s = Math.abs(dx); }
      var score = p + s * 2.4; if (score < bs) { bs = score; best = e; }
    });
    if (best) this.set(best);
  }
};

/* ======================================================================
 * ACCOUNTS screen
 * ==================================================================== */
function hue(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
function maskMac(m) { return m.length >= 17 ? m.substr(0, 8) + ':••:••:' + m.substr(15, 2) : m; }
function shortHost(p) { return String(p).replace(/^https?:\/\//i, '').replace(/\/+$/, ''); }
function hintBar(items) {
  return '<div class="hint">' + items.map(function (i) { return '<span><b class="k ' + (i[0] || '') + '">' + i[1] + '</b>' + esc(i[2]) + '</span>'; }).join('') + '</div>';
}
function renderAccounts(prefId) {
  applyLang();
  var s = $('#s-accounts'), h = '';
  h += '<div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div>';
  h += '<div class="lang f" data-act="lang">🌐 ' + esc(t('lang')) + '</div><div class="lang set f" data-act="settings">⚙ ' + esc(t('relaySet')) + '</div><div class="lang qr f" data-act="qr">📱 ' + esc(t('qrAdd')) + '</div>';
  h += '<h1>' + esc(t('accounts')) + '</h1><div class="sub">' + esc(t('pick')) + '</div><div class="cards">';
  S.accounts.forEach(function (a) {
    var hu = hue(a.name + (a.mac || a.user || ''));
    h += '<div class="card f" data-act="open" data-id="' + esc(a.id) + '">' +
      '<div class="art" style="background:linear-gradient(135deg,hsl(' + hu + ',72%,46%),hsl(' + ((hu + 55) % 360) + ',70%,28%))">' +
      '<span class="tag">' + (a.type === 'xtream' ? 'Xtream' : 'Stalker') + '</span>' + (a.id === S.last ? '<span class="last">' + esc(t('last')) + '</span>' : '') + '<div class="ini">' + esc(a.name.charAt(0)) + '</div></div>' +
      '<div class="info"><div class="nm">' + esc(a.name) + '</div><div class="hs">' + esc(shortHost(a.portal)) + '</div><div class="mc">' + esc(a.type === 'xtream' ? a.user : maskMac(a.mac)) + '</div></div></div>';
  });
  h += '<div class="card add f" data-act="add"><div class="plus">+</div><div class="tx">' + esc(t('addAccount')) + '</div></div></div>';
  h += hintBar([['', 'OK', t('open')], ['y', '●', t('edit')], ['', '⟲', t('exit')]]);
  s.innerHTML = h;
  Nav.init(s, prefId ? '[data-id="' + prefId + '"]' : (S.last ? '[data-id="' + S.last + '"]' : '.card.add'));
}
function showAccounts(prefId) { go('accounts'); renderAccounts(prefId); }

/* ======================================================================
 * FORM screen
 * ==================================================================== */
var F = null;
function fmtMac(v) { var h = String(v).replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12); return h.replace(/(.{2})(?=.)/g, '$1:'); }
function readForm() {
  if (!F) return;
  ['name', 'portal', 'mac', 'sn', 'dev1', 'dev2', 'relay', 'xmltv', 'user', 'pass'].forEach(function (k) { var i = $('#in-' + k); if (i) F.vals[k] = i.value; });
}
function showForm(acc) {
  var a = acc || {};
  F = { acc: acc || null, type: a.type === 'xtream' ? 'xtream' : 'stalker', adv: !!(a.sn || a.dev1 || a.dev2 || a.relay || a.fmt === 'm3u8'), confirmDel: false,
    vals: { name: a.name || '', portal: a.portal || '', mac: a.mac || '00:1A:79:', sn: a.sn || '', dev1: a.dev1 || '', dev2: a.dev2 || '', relay: a.relay || '', user: a.user || '', pass: a.pass || '', fmt: a.fmt === 'm3u8' ? 'm3u8' : 'ts' } };
  go('form'); renderForm();
}
function fld(id, label, w, ph) {
  return '<div class="fld' + (w ? ' w' : '') + '"><label>' + esc(label) + '</label><div class="inp f" data-act="input" data-in="' + id + '"><input id="in-' + id + '" type="text" autocomplete="off" spellcheck="false" placeholder="' + esc(ph || '') + '" value="' + esc(F.vals[id]) + '"></div></div>';
}
function renderForm(prefSel) {
  applyLang();
  var s = $('#s-form'), xt = F.type === 'xtream', h = '<div class="panel"><h2>' + esc(F.acc ? t('editAccount') : t('newAccount')) + '</h2>';
  h += '<div class="types"><div class="tchip f' + (xt ? '' : ' on') + '" data-act="type" data-v="stalker">' + esc(t('typeStalker')) + '</div><div class="tchip f' + (xt ? ' on' : '') + '" data-act="type" data-v="xtream">' + esc(t('typeXtream')) + '</div></div>';
  h += '<div class="fields">';
  if (xt) h += fld('name', t('name'), false, 'Home IPTV') + fld('portal', t('server'), false, 'http://example.com:8080') + fld('user', t('user'), false) + fld('pass', t('pass'), false);
  else h += fld('name', t('name'), false, 'Home IPTV') + fld('mac', t('mac'), false, '00:1A:79:XX:XX:XX') + fld('portal', t('portal'), true, 'http://example.com:8080/c/');
  h += '</div><div class="adv f" data-act="adv">' + (F.adv ? '▾ ' : '▸ ') + esc(t('advanced')) + '</div>';
  if (F.adv) {
    if (xt) h += '<div class="fields"><div class="fld"><label>' + esc(t('fmt')) + '</label><div class="inp f fmt" data-act="fmt">' + (F.vals.fmt === 'm3u8' ? 'HLS (m3u8)' : 'MPEG-TS (ts)') + '</div></div></div>';
    else h += '<div class="fields">' + fld('sn', t('sn'), false) + fld('dev1', t('dev1'), false) + fld('dev2', t('dev2'), false) + fld('relay', t('relay'), false, 'http://192.168.1.10:8787') + '</div>';
  }
  h += '<div class="btns"><div class="btn pri f" data-act="save">' + esc(t('save')) + '</div><div class="btn f" data-act="test">' + esc(t('test')) + '</div><div class="btn f" data-act="cancel">' + esc(t('cancel')) + '</div>';
  if (F.acc) h += '<div class="btn dan f" data-act="del">' + esc(F.confirmDel ? t('delSure') : t('del')) + '</div>';
  h += '</div><div class="status" id="fstatus"></div></div>';
  s.innerHTML = h;
  var mi = $('#in-mac'); if (mi) mi.addEventListener('input', function () { mi.value = fmtMac(mi.value); });
  Nav.init(s, prefSel || '[data-in="name"]');
}
function showSettings(back) {
  F = { mode: 'settings', back: typeof back === 'function' ? back : null, vals: { relay: Store.get('relay', ''), xmltv: Store.get('xmltv', '') } }; go('form');
  var s = $('#s-form'); applyLang();
  s.innerHTML = '<div class="panel"><h2>' + esc(t('settings')) + '</h2><div class="fields">' + fld('relay', t('relayGlobal'), true, 'http://192.168.1.10:8787') + fld('xmltv', t('xmltvF'), true, 'http://example.com/epg.xml') + '</div>' +
    '<div class="note">' + esc(t('relayNote')) + '</div><div class="note">' + esc(t('xmltvNote')) + '</div><div class="btns"><div class="btn pri f" data-act="save">' + esc(t('save')) + '</div><div class="btn f" data-act="test">' + esc(t('test')) + '</div><div class="btn f" data-act="cancel">' + esc(t('cancel')) + '</div></div><div class="status" id="fstatus"></div></div>';
  Nav.init(s, '[data-in="relay"]');
}
function settingsAct(act) {
  if (act === 'input') { var i = $('#in-relay'); if (i) i.focus(); return; }
  if (act === 'cancel') { if (F.back) F.back(); else showAccounts(); return; }
  readForm(); var v = normRelay(F.vals.relay);
  if (act === 'save') { Store.set('relay', v); var xo = Store.get('xmltv', ''), xn = String(F.vals.xmltv || '').replace(/^\s+|\s+$/g, ''); Store.set('xmltv', xn); if (xo !== xn && T.epgReset) T.epgReset(); if (F.back) F.back(); else showAccounts(); toast(t('saved')); return; }
  if (act === 'test') {
    if (!v) { formStatus('bad', t('relayBad')); return; }
    formStatus('', t('testing'));
    xhr(v + '/ping', {}, 6000).then(function () { if (S.screen === 'form') formStatus('ok', '✓ ' + t('relayOk')); }).catch(function () { if (S.screen === 'form') formStatus('bad', '✗ ' + t('relayBad')); });
  }
}
function validateForm() {
  readForm(); var v = F.vals, errs = null;
  v.mac = fmtMac(v.mac);
  if (!String(v.portal).trim()) errs = F.type === 'xtream' ? t('needServer') : t('needPortal');
  else if (F.type === 'xtream') { if (!String(v.user).trim() || !String(v.pass).trim()) errs = t('needUser'); }
  else if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(v.mac)) errs = t('badMac');
  return errs;
}
function formStatus(cls, msg) { var e = $('#fstatus'); if (e) { e.className = 'status ' + (cls || ''); e.textContent = msg || ''; } }
function accountFromForm() {
  var v = F.vals;
  var base = { id: F.acc ? F.acc.id : 'a' + Date.now().toString(36), type: F.type, name: String(v.name).trim() || ('IPTV ' + (S.accounts.length + 1)), portal: String(v.portal).trim() };
  if (F.type === 'xtream') { base.user = String(v.user).trim(); base.pass = String(v.pass).trim(); base.fmt = v.fmt === 'm3u8' ? 'm3u8' : 'ts'; base.mac = ''; }
  else { base.mac = v.mac; base.sn = String(v.sn).trim(); base.dev1 = String(v.dev1).trim(); base.dev2 = String(v.dev2).trim(); base.relay = String(v.relay).trim(); }
  return base;
}
function errText(e) {
  var c = e && e.code;
  return c === 'auth' ? (e.xt ? t('badAuth') : t('errAuth')) : c === 'parse' ? (e.relayTried ? t('errParseRelay') : t('errParse')) : c === 'empty' ? t('errEmpty') : t('errNet');
}
function formAct(act) {
  if (F.mode === 'settings') { settingsAct(act); return; }
  if (act === 'type') { var nv = Nav.cur.getAttribute('data-v'); if (nv !== F.type) { readForm(); F.type = nv; renderForm('[data-act="type"][data-v="' + nv + '"]'); } return; }
  if (act === 'fmt') { F.vals.fmt = F.vals.fmt === 'm3u8' ? 'ts' : 'm3u8'; Nav.cur.textContent = F.vals.fmt === 'm3u8' ? 'HLS (m3u8)' : 'MPEG-TS (ts)'; return; }
  if (act === 'input') { var i = $('#in-' + Nav.cur.getAttribute('data-in')); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } return; }
  if (act === 'adv') { readForm(); F.adv = !F.adv; renderForm('[data-act="adv"]'); return; }
  if (act === 'cancel') { showAccounts(F.acc && F.acc.id); return; }
  if (act === 'del') {
    if (!F.confirmDel) { F.confirmDel = true; Nav.cur.textContent = t('delSure'); return; }
    S.accounts = S.accounts.filter(function (a) { return a.id !== F.acc.id; }); saveAccounts(); Store.set('fav_' + F.acc.id, null);
    showAccounts(); toast(t('deleted')); return;
  }
  var err = validateForm();
  if (err) { formStatus('bad', err); return; }
  if (act === 'save') {
    var acc = accountFromForm();
    if (F.acc) S.accounts = S.accounts.map(function (a) { return a.id === acc.id ? acc : a; }); else S.accounts.push(acc);
    saveAccounts(); showAccounts(acc.id); toast(t('saved')); return;
  }
  if (act === 'test') {
    formStatus('', t('testing'));
    var ta = accountFromForm(); ta._tmp = true; var p = makeClient(ta);
    p.connect().then(function () { return p.accountInfo(); }).then(function (info) {
      var msg = '✓ ' + t('okConn') + ' (' + t(p.via === 'relay' ? 'viaRelay' : 'viaDirect') + ')';
      var exp = info && (info.end_date || info.expire_billing_date || info.phone); if (exp) msg += '  ·  ' + t('expires') + ': ' + exp;
      if (info && info.status) msg += '  ·  ' + info.status + (info.max ? ' · ' + info.max + ' ' + t('conns') : '');
      if (S.screen === 'form') formStatus('ok', msg);
    }).catch(function (e) { if (S.screen === 'form') formStatus('bad', '✗ ' + errText(e)); });
  }
}

/* ======================================================================
 * LOADING / connect flow
 * ==================================================================== */
function renderLoading(step, errMsg) {
  var s = $('#s-loading');
  s.innerHTML = '<div class="center"><div class="ring' + (errMsg ? ' stop' : '') + '"></div><div class="tt">' + esc(S.acc ? S.acc.name : '') + '</div><div class="st">' + esc(errMsg || step) + '</div>' +
    (errMsg ? '<div class="btns"><div class="btn pri f" data-act="retry">' + esc(t('retry')) + '</div><div class="btn f" data-act="back">' + esc(t('back')) + '</div></div>' : '') + '</div>';
  if (errMsg) Nav.init(s, '[data-act="retry"]');
}
function openAccount(acc) {
  S.acc = acc; S.last = acc.id; Store.set('lastAcc', acc.id);
  var tok = ++S.loadTok, p = makeClient(acc); S.portal = p;
  S.channels = []; S.genres = []; S.liveLoaded = false; S.livePromise = null; S.epg = {}; S.playing = null; S.linkCache = {}; S.data = {};
  S.favs = Store.get('fav_' + acc.id, null) || {};
  go('loading'); renderLoading(t('connecting'));
  p.connect().then(function () {
    if (tok !== S.loadTok) return;
    if (T.openHub) T.openHub(); else enterLive();
  }).catch(function (e) { if (tok === S.loadTok && S.screen === 'loading') renderLoading('', errText(e)); });
}
function loadLive() {
  if (S.liveLoaded) return Promise.resolve();
  if (S.livePromise) return S.livePromise;
  var p = S.portal, acc = S.acc;
  S.livePromise = Promise.all([p.genres().catch(function () { return []; }), p.channels()]).then(function (r) {
    if (S.acc !== acc) return;
    var chans = p.normalize(r[1] || []); if (!chans.length) throw mkErr('empty');
    S.genres = r[0]; S.channels = chans; S.liveLoaded = true;
  }).catch(function (e) { S.livePromise = null; throw e; });
  return S.livePromise;
}
function enterLive() {
  var tok = ++S.loadTok;
  if (S.liveLoaded) { startBrowse(); return; }
  go('loading'); renderLoading(t('loadingCh'));
  loadLive().then(function () { if (tok === S.loadTok) startBrowse(); }).catch(function (e) { if (tok === S.loadTok && S.screen === 'loading') renderLoading('', errText(e)); });
}

/* ======================================================================
 * virtualised list
 * ==================================================================== */
function VList(box, rowH, vh, build) {
  this.box = box; this.rowH = rowH; this.vh = vh; this.build = build; this.items = []; this.focus = 0; this.scroll = 0; this.has = false; this.activeFn = null; this.rows = {};
  box.innerHTML = '';
}
VList.prototype.clear = function () { for (var k in this.rows) this.box.removeChild(this.rows[k]); this.rows = {}; };
VList.prototype.setItems = function (items, focus) { this.clear(); this.items = items; this.focus = Math.max(0, Math.min(focus || 0, items.length - 1)); this.scroll = 0; this.fix(); this.render(); };
VList.prototype.fix = function () {
  var top = this.focus * this.rowH, bot = top + this.rowH, max = Math.max(0, this.items.length * this.rowH - this.vh);
  if (top < this.scroll) this.scroll = top - this.rowH; else if (bot > this.scroll + this.vh) this.scroll = bot - this.vh + this.rowH;
  this.scroll = Math.max(0, Math.min(this.scroll, max));
};
VList.prototype.setFocus = function (i) { this.focus = Math.max(0, Math.min(i, this.items.length - 1)); this.fix(); this.render(); };
VList.prototype.rebuild = function (i) {
  var r = this.rows[i]; if (!r) return; var n = this.build(this.items[i], i); this.box.replaceChild(n, r); this.rows[i] = n; this.render();
};
VList.prototype.render = function () {
  var n = this.items.length, rh = this.rowH, first = Math.max(0, Math.floor(this.scroll / rh) - 2), last = Math.min(n - 1, Math.ceil((this.scroll + this.vh) / rh) + 2), k, i;
  for (k in this.rows) { if (Number(k) < first || Number(k) > last) { this.box.removeChild(this.rows[k]); delete this.rows[k]; } }
  for (i = first; i <= last; i++) {
    var r = this.rows[i];
    if (!r) { r = this.build(this.items[i], i); r.style.height = (rh - 6) + 'px'; this.box.appendChild(r); this.rows[i] = r; }
    var tf = 'translate3d(0,' + (i * rh - this.scroll) + 'px,0)';
    if (r.__t !== tf) { r.__t = tf; r.style.transform = tf; }
    var fc = this.has && i === this.focus; if (r.__f !== fc) { r.__f = fc; r.classList.toggle('focus', fc); }
    if (this.activeFn) { var ac = !!this.activeFn(this.items[i]); if (r.__a !== ac) { r.__a = ac; r.classList.toggle('active', ac); } }
  }
};

/* ======================================================================
 * BROWSE screen
 * ==================================================================== */
var chList, catList;
function isFav(c) { return !!S.favs[c.id]; }
function favCount() { var n = 0; S.channels.forEach(function (c) { if (S.favs[c.id]) n++; }); return n; }
function genreName(c) { for (var i = 0; i < S.genres.length; i++) if (S.genres[i].id === c.genre) return S.genres[i].title; return ''; }
function buildCats() {
  var cnt = {}; S.channels.forEach(function (c) { cnt[c.genre] = (cnt[c.genre] || 0) + 1; });
  S.cats = [{ id: 'all', title: t('all'), count: S.channels.length }, { id: 'fav', title: '★ ' + t('favs'), count: favCount() }];
  S.genres.forEach(function (g) { if (cnt[g.id]) S.cats.push({ id: g.id, title: g.title, count: cnt[g.id] }); });
}
function filterList() {
  var cat = S.cats[S.catIdx], q = S.query.toLowerCase();
  S.list = S.channels.filter(function (c) {
    if (q) return c.name.toLowerCase().indexOf(q) >= 0;
    if (cat.id === 'fav') return isFav(c);
    if (cat.id !== 'all') return c.genre === cat.id;
    return true;
  });
}
function logoHtml(c) {
  return '<span class="in">' + esc(c.name.charAt(0)) + '</span>' + (c.logo ? '<img decoding="async" src="' + esc(c.logo) + '" onerror="this.parentNode.removeChild(this)">' : '');
}
function chRow(c) {
  var r = el('div', 'row ch'), e = epgNow(c);
  r.innerHTML = '<span class="num">' + c.number + '</span><span class="logo">' + logoHtml(c) + '</span><span class="meta"><b>' + esc(c.name) + '</b><em class="ev">' + esc(e && e.cur ? e.cur.name : '') + '</em><i>' + esc(genreName(c)) + '</i></span>' +
    '<span class="star">' + (isFav(c) ? '★' : '') + '</span><span class="eq"><u></u><u></u><u></u></span>';
  if (!S.epg[c.id]) rowEpg(c, r);
  return r;
}
/* lazy per-row EPG: only visible rows, 3 at a time, stale rows skipped */
var epgQ = [], epgBusy = 0, epgInfl = {};
function epgFetch(ch, cb) {
  var have = S.epg[ch.id]; if (have && have._t && Date.now() - have._t < 120000) { cb(have); return; }
  if (epgInfl[ch.id]) { epgInfl[ch.id].push(cb); return; }
  epgInfl[ch.id] = [cb];
  var done = function (l) { l = l || []; l._t = Date.now(); S.epg[ch.id] = l; var cbs = epgInfl[ch.id]; delete epgInfl[ch.id]; for (var i = 0; i < cbs.length; i++) cbs[i](l); };
  try { S.portal.epg(ch).then(function (l) { return (l && l.length) || !T.epgMore ? l : T.epgMore(ch); }).then(done, function () { done([]); }); } catch (e) { done([]); }
}
function rowEpg(c, r) {
  r.__c = c; epgQ.push(r); clearTimeout(rowEpg.t); rowEpg.t = setTimeout(pumpEpg, 180);
}
function pumpEpg() {
  while (epgBusy < 3 && epgQ.length) {
    var r = epgQ.shift(); if (!r.parentNode || S.screen !== 'browse') continue;
    (function (r, c) { epgBusy++; epgFetch(c, function () { epgBusy--; var e = epgNow(c), ev = r.parentNode && r.querySelector('.ev'); if (ev) ev.textContent = e && e.cur ? e.cur.name : ''; pumpEpg(); }); })(r, r.__c);
  }
}
function catRow(c, i) {
  var r = el('div', 'row ct' + (i === S.catIdx ? ' on' : ''));
  r.innerHTML = '<span class="cname">' + esc(c.title) + '</span><span class="cnt">' + (c.id === 'fav' ? favCount() : c.count) + '</span>'; return r;
}
function startBrowse() {
  S.query = '';
  var s = $('#s-browse');
  s.innerHTML =
    '<div class="topbar"><div class="brand"><span class="mark"></span><b>Stalker<span>TV</span></b></div><div class="chip" id="accChip"></div><div id="clock"></div></div>' +
    '<div class="colL"><div class="now" id="now"></div>' +
    '<div class="keys">' +
    '<span><b class="k">OK</b>' + esc(t('play')) + '</span> ' +
    '<span><b class="k r">●</b>' + esc(t('fav')) + '</span> ' +
    '<span><b class="k g">●</b>' + esc(t('search')) + '</span> ' +
    '<span><b class="k y">●</b>' + esc(t('accts')) + '</span> ' +
    '<span><b class="k b">●</b>' + esc(t('reload')) + '</span></div></div>' +
    '<div class="colM"><div class="search" id="searchBox"><span class="ic">🔍</span><input id="q" type="text" autocomplete="off" placeholder="' + esc(t('searchPh')) + '"></div><div id="chBox"></div></div>' +
    '<div class="colR"><div id="catBox"></div></div>';
  $('#accChip').textContent = S.acc.name;
  go('browse');
  buildCats();
  catList = new VList($('#catBox'), 78, 810, catRow);
  catList.setItems(S.cats, 0);
  chList = new VList($('#chBox'), 90, 770, chRow);
  chList.activeFn = function (c) { return S.playing && S.playing.id === c.id; };
  S.catIdx = 0; filterList(); chList.setItems(S.list, 0);
  $('#q').addEventListener('input', function () { S.query = this.value; filterList(); chList.setItems(S.list, 0); renderNone(); });
  setZone('chan'); renderNow(); renderNone(); clock();
  var pend = !!S.pendingCh, lastId = S.pendingCh || Store.get('lastCh_' + S.acc.id, null); S.pendingCh = null;
  if (lastId) { var idx = -1; S.list.forEach(function (c, i) { if (c.id === lastId) idx = i; }); if (idx >= 0) { chList.setFocus(idx); tune(S.list[idx], true); if (pend) goFull(); } }
}
function renderNone() {
  var old = $('#noneMsg'); if (old) old.parentNode.removeChild(old);
  if (!S.list.length) { var d = el('div', 'none', esc(t('noCh'))); d.id = 'noneMsg'; $('#chBox').appendChild(d); }
}
function setZone(z) {
  S.zone = z;
  if (chList) { chList.has = z === 'chan'; chList.render(); }
  if (catList) { catList.has = z === 'cat'; catList.render(); }
  var sb = $('#searchBox'); if (sb) { sb.classList.toggle('focus', z === 'search'); sb.classList.add('f'); }
}
function applyCat(i) {
  S.catIdx = i; S.query = ''; var q = $('#q'); if (q) q.value = '';
  filterList(); chList.setItems(S.list, 0); catList.setItems(S.cats, i); catList.setFocus(i); renderNone();
}
function curCh() { return S.list[chList.focus]; }
function refreshCats() { buildCats(); catList.items = S.cats; catList.clear(); catList.render(); }
function toggleFav(c) {
  if (!c) return;
  if (S.favs[c.id]) delete S.favs[c.id]; else S.favs[c.id] = 1;
  Store.set('fav_' + S.acc.id, S.favs);
  var onFav = S.cats[S.catIdx].id === 'fav' && !S.query;
  if (onFav) { var f = chList.focus; filterList(); chList.setItems(S.list, Math.min(f, S.list.length - 1)); renderNone(); }
  else chList.rebuild(chList.focus);
  refreshCats(); toast((S.favs[c.id] ? '★ ' : '☆ ') + c.name, 1500);
}

/* now card + epg */
function fmtTime(ts) { var d = new Date(ts * 1000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function epgNow(ch) {
  var list = S.epg[ch.id]; if (!list) return null; var n = Date.now() / 1000, cur = null, nxt = null;
  for (var i = 0; i < list.length; i++) { var e = list[i]; if (e.start && e.stop) { if (e.start <= n && n < e.stop) cur = e; else if (e.start > n && !nxt) nxt = e; } }
  if (!cur && list.length && !list[0].start) { cur = list[0]; nxt = list[1] || null; }
  return { cur: cur, nxt: nxt };
}
function epgHtml(ch) {
  var e = epgNow(ch), h = '';
  if (!e || (!e.cur && !e.nxt)) return '<div class="empty-epg">' + esc(S.epg[ch.id] ? t('noEpg') : '…') + '</div>';
  if (e.cur) {
    var pct = e.cur.stop > e.cur.start ? Math.max(0, Math.min(100, (Date.now() / 1000 - e.cur.start) / (e.cur.stop - e.cur.start) * 100)) : 0;
    h += '<div class="epg"><div class="l">' + esc(t('now')) + '</div><div class="t">' + esc(e.cur.name) + '</div>' +
      (e.cur.start ? '<div class="tm">' + fmtTime(e.cur.start) + ' – ' + fmtTime(e.cur.stop) + '</div><div class="bar"><u style="width:' + pct.toFixed(0) + '%"></u></div>' : '') + '</div>';
  }
  if (e.nxt) h += '<div class="epg"><div class="l">' + esc(t('next')) + '</div><div class="t">' + esc(e.nxt.name) + '</div><div class="tm">' + fmtTime(e.nxt.start) + '</div></div>';
  return h;
}
function epgUpcoming(ch, n) {
  var l = S.epg[ch.id] || [], now = Date.now() / 1000, out = [], i;
  for (i = 0; i < l.length && out.length < n; i++) if (l[i].start > now) out.push(l[i]);
  return out;
}
function renderNow() {
  var box = $('#now'); if (!box) return;
  var c = (S.screen === 'browse' && curCh()) || S.playing || curCh();
  if (!c) { box.innerHTML = '<div class="empty-epg">' + esc(t('pickCh')) + '</div>'; return; }
  var e = epgNow(c) || {}, cur = e.cur, now = Date.now() / 1000, h;
  h = '<div class="nc nc1"><span class="lg">' + logoHtml(c) + '</span><div class="ni"><b>' + esc(c.name) + '</b><i>' + esc(genreName(c)) + ' · #' + esc(c.number) + '</i></div></div>';
  if (cur) {
    var span = cur.stop > cur.start, pct = span ? Math.max(0, Math.min(100, (now - cur.start) / (cur.stop - cur.start) * 100)) : 0, left = span ? Math.max(0, Math.ceil((cur.stop - now) / 60)) : 0;
    h += '<div class="nc nc2"><div class="nl">' + esc(t('now')) + '</div><div class="nt">' + esc(cur.name) + '</div>' +
      (cur.start ? '<div class="nr"><span>' + fmtTime(cur.start) + ' – ' + fmtTime(cur.stop) + '</span>' + (left ? '<span class="mn">+' + left + ' ' + esc(t('minWord')) + '</span>' : '') + '</div><div class="bar"><u style="width:' + pct.toFixed(0) + '%"></u></div>' : '') +
      (cur.desc ? '<p class="nd">' + esc(cur.desc) + '</p>' : '') + '</div>';
  } else h += '<div class="nc nc2"><div class="empty-epg">' + esc(S.epg[c.id] ? t('noEpg') : '…') + '</div></div>';
  var up = epgUpcoming(c, 4), i;
  if (up.length) { h += '<div class="nc nc3">'; for (i = 0; i < up.length; i++) h += '<div class="nu"><b>' + fmtTime(up[i].start) + '</b><span>' + esc(up[i].name) + '</span></div>'; h += '</div>'; }
  box.innerHTML = h;
  if (!S.epg[c.id]) epgFetch(c, function () { if (S.screen === 'browse' && (curCh() || {}).id === c.id) renderNow(); });
  if (S.screen === 'full') renderOsd();
}
function loadEpg(ch) {
  var have = S.epg[ch.id]; if (have && have._t && Date.now() - have._t < 120000) return;
  S.portal.epg(ch).then(function (l) { return (l && l.length) || !T.epgMore ? l : T.epgMore(ch); }).then(function (l) { l = l || []; l._t = Date.now(); S.epg[ch.id] = l; if (S.playing && S.playing.id === ch.id) { renderNow(); if (S.screen === 'full' && $('#s-full').classList.contains('show')) renderOsd(); } });
}
function clock() {
  var c = $('#clock'); if (!c) return; var d = new Date(); c.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  clearTimeout(clock.t); clock.t = setTimeout(clock, 20000);
}

/* tuning (link cache + prefetch => no waiting on create_link) */
function getLink(ch) {
  var c = S.linkCache[ch.id], n = Date.now();
  if (c && n - c.t < 40000) return c.p;
  var p = S.portal.link(ch); S.linkCache[ch.id] = { t: n, p: p }; p.catch(function () { delete S.linkCache[ch.id]; }); return p;
}
function schedulePrefetch() {
  clearTimeout(schedulePrefetch.t);
  schedulePrefetch.t = setTimeout(function () { var c = chList && curCh(); if (c && S.acc && S.acc.type !== 'xtream') getLink(c); }, 160);
}
function tune(ch, now) {
  S.playing = ch; Store.set('lastCh_' + S.acc.id, ch.id);
  chList.render(); renderNow();
  clearTimeout(tune.t); Player.stop(); stageMsg('load', t('tuning'));
  tune.t = setTimeout(function () {
    var gen0 = ++tune.n;
    getLink(ch).then(function (url) {
      if (gen0 !== tune.n || S.playing !== ch) return;
      if (T.Subs) T.Subs.reset();
      Player.play(url, {
        onState: function (st) { if (st === 'buffering') stageMsg('load', t('buffering')); else if (st === 'playing') stageMsg(null); },
        onReady: function () { if (gen0 === tune.n && T.Subs) T.Subs.ready(); },
        onError: function () { stageMsg('err', t('playErr')); if (S.screen === 'full') showOsd(6000); }
      }, { onSub: function (txt, d) { if (gen0 === tune.n && T.Subs) T.Subs.cue(txt, d); } });
    });
    loadEpg(ch);
  }, now ? 0 : 45);
}
tune.n = 0;

/* ---- fullscreen ---- */
var osdTimer;
/* quality ladder for the current stream: position 0 = Auto, then the HLS variants from best to worst */
function qState() {
  var vs = Quality.cache[Player.master || Player.url] || [], seen = {}, list = [], i;
  vs.forEach(function (v) { var lb = Quality.label(v); if (!seen[lb]) { seen[lb] = 1; list.push(v); } });
  var idx = 0, cur = Player.variant || ''; if (cur) for (i = 0; i < list.length; i++) if (list[i].url === cur) idx = i + 1;
  if (S.qPend != null) idx = S.qPend;
  return { list: list, idx: idx };
}
function qHtml(noArr) {
  var q = qState(), n = q.list.length, h = [7, 13, 19, 26], b = '', i, lb, bars, cls = '';
  function arr(c, x) { return noArr ? '' : '<span class="ar' + (x ? ' x' : '') + '">' + c + '</span>'; }
  if (!n) { lb = t('origQ'); bars = 4; cls = ' dim'; }
  else { bars = q.idx === 0 ? 4 : Math.ceil(4 * (n - (q.idx - 1)) / n); lb = q.idx === 0 ? 'AUTO' : Quality.label(q.list[q.idx - 1]); if (S.qPend != null) cls = ' chg'; }
  for (i = 0; i < 4; i++) b += '<b' + (i < bars ? ' class="on"' : '') + ' style="height:' + h[i] + 'px"></b>';
  return '<div class="ib-q' + cls + '">' + arr('‹', !n || q.idx >= n) + '<span class="bars">' + b + '</span><span class="ql">' + esc(lb) + '</span>' + arr('›', !n || q.idx === 0) + '</div>';
}
function clockTxt2() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function dateTxt() { try { return new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ''; } }
function osdBadges(c) {
  var v = $('#vid'), w = (v && v.videoWidth) || 0, hh = (v && v.videoHeight) || 0;
  var hd = /(^|[^a-z])(hd|fhd|uhd|4k)([^a-z]|$)/i.test(c.name) || hh >= 720, sub = !!(T.Subs && T.Subs.tracks && T.Subs.tracks.length);
  function b(on, x) { return '<b' + (on ? ' class="on"' : '') + '>' + x + '</b>'; }
  return '<div class="ib-badges">' + b(hd, 'HD') + (w ? b(true, w + '×' + hh) : '') + (w ? b(Math.abs(w / hh - 16 / 9) < .03, '16:9') : '') + b(sub, 'SUB') + '</div>';
}
function renderOsd() {
  var c = S.playing; if (!c) return; var s = $('#s-full'), e = epgNow(c), cur = e && e.cur, nxt = e && e.nxt, now = Date.now() / 1000;
  var span = cur && cur.stop > cur.start, pct = span ? Math.max(0, Math.min(100, (now - cur.start) / (cur.stop - cur.start) * 100)) : 0;
  var left = span ? Math.max(0, Math.ceil((cur.stop - now) / 60)) : 0, d = new Date(), C = 2 * Math.PI * 42;
  var nl = nxt && nxt.stop > nxt.start ? Math.round((nxt.stop - nxt.start) / 60) : 0;
  s.innerHTML = osdBadges(c) + '<div class="ibar"><div class="ib-lg"><div class="lgb"><span class="li">' + esc(c.name.charAt(0)) + '</span>' + (c.logo ? '<img decoding="async" src="' + esc(c.logo) + '" onerror="this.parentNode.removeChild(this)">' : '') + '</div><span class="ib-no">' + esc(c.number) + '</span></div>' +
    '<div class="ib-mid"><div class="ib-top"><span class="live">LIVE</span><span class="chn">' + esc(c.name) + '</span>' + (genreName(c) ? '<span class="grp">' + esc(genreName(c)) + '</span>' : '') + (S.favs[c.id] ? '<span class="ib-fav">★</span>' : '') + '</div>' +
    '<div class="ib-title">' + (cur ? esc(cur.name) : '&nbsp;') + '</div>' +
    '<div class="ib-time">' + (cur && cur.start ? fmtTime(cur.start) + ' – ' + fmtTime(cur.stop) : '&nbsp;') + '</div>' +
    '<div class="ib-next">' + (nxt ? '<b>' + esc(t('next')) + '</b><span class="nx">' + (nxt.start ? fmtTime(nxt.start) + ' – ' + fmtTime(nxt.stop) : '') + '</span><span class="nt2">' + esc(nxt.name) + '</span>' + (nl ? '<span class="nm">' + nl + ' ' + esc(t('minWord')) + '</span>' : '') : '&nbsp;') + '</div></div>' +
    '<div class="ib-ring"><svg viewBox="0 0 100 100" width="150" height="150"><circle cx="50" cy="50" r="42" class="tr"/><circle cx="50" cy="50" r="42" class="fg" transform="rotate(-90 50 50)" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><span>' + (span ? '+' + left + ' ' + esc(t('minWord')) : '') + '</span></div>' +
    '<div class="ib-side"><div class="ib-clock">' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '</div><div class="ib-date">' + esc(dateTxt()) + '</div>' + qHtml() + '</div></div>';
}
function showOsd(ms) {
  var s = $('#s-full'); renderOsd(); s.classList.add('show'); clearTimeout(osdTimer); osdTimer = setTimeout(function () { s.classList.remove('show'); }, ms || 3200);
  clearTimeout(showOsd.q); showOsd.q = setTimeout(ensureQ, 500);
}
/* the variant list of an HLS stream is only fetched when needed (Auto mode never reads it) */
function ensureQ(cb) {
  var u = Player.master || Player.url, p0 = S.playing;
  if (!u || Quality.cache[u] || !Quality.isHls(u)) { if (cb) cb(); return; }
  Quality.load(u).then(function () { if (S.playing === p0 && S.screen === 'full' && $('#s-full').classList.contains('show')) renderOsd(); if (cb) cb(); });
}
/* ◄ lower / ► raise the quality while watching live (restarts the stream on the chosen variant; remembered as the default) */
function nearestQual(v, idx, n) {
  if (!v.h) return idx === 1 ? '1080' : idx === n ? '360' : '720';
  var best = '360'; ['360', '480', '720', '1080'].forEach(function (q) { if (Number(q) <= v.h) best = q; }); return best;
}
function qStep(dir) {
  var u0 = Player.master || Player.url; if (u0 && Quality.isHls(u0) && !Quality.cache[u0]) { ensureQ(function () { qStep(dir); }); return; }
  var q = qState(), n = q.list.length;
  if (!n) { showOsd(); toast(t('onlyOne'), 1800); return; }
  var ni = q.idx - dir; if (ni < 0 || ni > n) { showOsd(4000); toast(t(dir > 0 ? 'qTop' : 'qLow'), 1400); return; }
  S.qPend = ni; showOsd(4000);
  clearTimeout(qStep.t);
  qStep.t = setTimeout(function () {
    var url = ni ? q.list[ni - 1].url : '';
    Prefs.quality = ni ? nearestQual(q.list[ni - 1], ni, n) : 'auto'; savePrefs();
    S.qPend = null;
    if (S.playing && S.screen === 'full') { stageMsg('load', t('buffering')); Player.setVariant(url); showOsd(4000); }
  }, 450);
}
function goFull() { if (!S.playing) return; go('full'); showOsd(); }
function leaveFull() { go('browse'); setZone('chan'); setTimeout(renderNow, 0); }
function zap(delta) {
  if (!S.list.length) return;
  var i = chList.focus + delta; if (i < 0) i = S.list.length - 1; if (i >= S.list.length) i = 0;
  chList.setFocus(i); tune(S.list[i]); if (S.screen === 'full') showOsd();
}
function commitNumber() {
  var n = Number(S.numBuf); S.numBuf = ''; $('#numbox').style.display = 'none';
  var c = null; S.channels.forEach(function (x) { if (x.number === n) c = x; });
  if (!c) { toast('#' + n + ' ✗', 1500); return; }
  var idx = -1; S.list.forEach(function (x, i) { if (x.id === c.id) idx = i; });
  if (idx < 0) { applyCat(0); S.list.forEach(function (x, i) { if (x.id === c.id) idx = i; }); }
  chList.setFocus(idx); tune(c, true); if (S.screen === 'full') showOsd();
}
function numKey(d) {
  S.numBuf = (S.numBuf + d).slice(0, 4); var nb = $('#numbox'); nb.textContent = S.numBuf; nb.style.display = 'block';
  clearTimeout(numKey.t); numKey.t = setTimeout(commitNumber, 1600);
}

/* ---- browse key handling ---- */
function toHub() { Player.stop(); stageMsg(null); S.playing = null; if (T.openHub) T.openHub(); else showAccounts(S.acc.id); }
function soonNow() { clearTimeout(soonNow.t); soonNow.t = setTimeout(function () { if (S.screen === 'browse') { renderNow(); schedulePrefetch(); } }, 70); }
function browseKey(k) {
  var z = S.zone;
  if (k === 'back') { toHub(); return; }
  if (k === 'red') { toggleFav(z === 'chan' ? curCh() : null); return; }
  if (k === 'green') { setZone('search'); return; }
  if (k === 'yellow') { toHub(); return; }
  if (k === 'blue') { Player.stop(); openAccount(S.acc); return; }
  if (k === 'chup') { zap(-1); return; }
  if (k === 'chdown') { zap(1); return; }
  if (k === 'info') { return; }
  if (z === 'chan') {
    if (k === 'up') { if (chList.focus > 0) { chList.setFocus(chList.focus - 1); soonNow(); } else setZone('search'); }
    else if (k === 'down') { chList.setFocus(chList.focus + 1); soonNow(); }
    else if (k === 'right') setZone('cat');
    else if (k === 'left') { if (S.playing) goFull(); }
    else if (k === 'ok') { var c = curCh(); if (!c) return; if (S.playing && S.playing.id === c.id) goFull(); else tune(c); }
  } else if (z === 'cat') {
    if (k === 'up') { if (S.catIdx > 0) applyCat(S.catIdx - 1); }
    else if (k === 'down') { if (S.catIdx < S.cats.length - 1) applyCat(S.catIdx + 1); }
    else if (k === 'left' || k === 'ok') setZone('chan');
  } else if (z === 'search') {
    if (k === 'down') setZone('chan');
    else if (k === 'right') setZone('cat');
    else if (k === 'ok') { $('#q').focus(); }
  }
}
function fullKey(k) {
  if (k === 'back') { leaveFull(); return; }
  if (k === 'up' || k === 'chup') { zap(-1); return; }
  if (k === 'down' || k === 'chdown') { zap(1); return; }
  if (k === 'ok') { leaveFull(); return; }
  if (k === 'left') { qStep(-1); return; }
  if (k === 'right') { qStep(1); return; }
  if (k === 'info') { showOsd(6000); return; }
  if (k === 'red') { toggleFav(curCh()); if (S.screen === 'full') showOsd(); return; }
  if (k === 'yellow') { if (T.openMenu) T.openMenu('live'); return; }
}

/* ======================================================================
 * keys
 * ==================================================================== */
var KEYS = { 13: 'ok', 37: 'left', 38: 'up', 39: 'right', 40: 'down', 10009: 'back', 27: 'back', 403: 'red', 404: 'green', 405: 'yellow', 406: 'blue',
  427: 'chup', 428: 'chdown', 33: 'chup', 34: 'chdown', 457: 'info', 73: 'info', 82: 'red', 71: 'green', 89: 'yellow', 66: 'blue', 10182: 'exit',
  8: 'back', 112: 'red', 113: 'green', 114: 'yellow', 115: 'blue', 32: 'playpause', 179: 'playpause', 415: 'play', 19: 'pause', 10252: 'playpause', 413: 'stop', 417: 'ff', 412: 'rw', 80: 'playpause' };
try {
  if (window.tizen && tizen.tvinputdevice) {
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'ChannelUp', 'ChannelDown', 'Info', 'MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind'].forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} });
  }
} catch (e) {}
function exitApp() { try { Store.set('run', null); Player.stop(); tizen.application.getCurrentApplication().exit(); } catch (e) {} }

function handle(k) {
  var sc = S.screen;
  if (T.menu.open) { T.menu.key(k); return; }
  if (/^d\d$/.test(k)) { if (sc === 'browse' || sc === 'full') numKey(k.charAt(1)); return; }
  if (sc === 'browse') return browseKey(k);
  if (sc === 'full') return fullKey(k);
  if (T.keys[sc]) return T.keys[sc](k);
  if (k === 'exit') { exitApp(); return; }
  if (sc === 'accounts') {
    if (k === 'back') { exitApp(); return; }
    if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { Nav.move(k); return; }
    var c = Nav.cur; if (!c) return; var act = c.getAttribute('data-act'), id = c.getAttribute('data-id');
    if (k === 'ok') {
      if (act === 'add') showForm(null);
      else if (act === 'settings') showSettings(null);
      else if (act === 'qr') { if (T.openQr) T.openQr(); }
      else if (act === 'lang') { lang = lang === 'ar' ? 'en' : 'ar'; Store.set('lang', lang); renderAccounts(); Nav.init($('#s-accounts'), '[data-act="lang"]'); }
      else if (act === 'open') openAccount(S.accounts.filter(function (a) { return a.id === id; })[0]);
    } else if ((k === 'yellow' || k === 'red') && act === 'open') showForm(S.accounts.filter(function (a) { return a.id === id; })[0]);
    return;
  }
  if (sc === 'form') {
    if (k === 'back') { formAct('cancel'); return; }
    if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { F.confirmDel = false; Nav.move(k); return; }
    if (k === 'ok' && Nav.cur) formAct(Nav.cur.getAttribute('data-act'));
    return;
  }
  if (sc === 'loading') {
    if (k === 'back') { S.loadTok++; if (S.portal && S.portal.via && T.openHub && S.acc && S.hubOpened) T.openHub(); else showAccounts(S.acc && S.acc.id); return; }
    if (k === 'left' || k === 'right') Nav.move(k);
    if (k === 'ok' && Nav.cur) { var a = Nav.cur.getAttribute('data-act'); if (a === 'retry') openAccount(S.acc); else { S.loadTok++; showAccounts(S.acc.id); } }
  }
}
var lastRep = 0;
document.addEventListener('keydown', function (e) {
  var ae = document.activeElement, typing = ae && ae.tagName === 'INPUT', kc = e.keyCode, k = KEYS[kc];
  if (!k && ((kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105))) k = 'd' + (kc >= 96 ? kc - 96 : kc - 48);
  if (typing) {
    if (T.typing && T.typing(kc, ae)) { e.preventDefault(); return; }
    if (kc === 13) { ae.blur(); e.preventDefault(); if (S.screen === 'browse') setZone('chan'); return; }
    if (kc === 38 || kc === 40) { ae.blur(); e.preventDefault(); if (S.screen === 'browse') { setZone('chan'); } else handle(k); return; }
    if (kc === 10009 || kc === 27) { ae.blur(); e.preventDefault(); if (S.screen === 'browse') setZone('chan'); return; }
    return;
  }
  if (!k) return;
  e.preventDefault();
  if (e.repeat) { var nw = Date.now(); if (nw - lastRep < 70) return; lastRep = nw; }
  handle(k);
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { var rr = Store.get('run', null); if (rr) { rr.bg = 1; Store.set('run', rr); } }
  else { var r2 = Store.get('run', null); if (r2 && r2.bg) { delete r2.bg; Store.set('run', r2); } }
  if (document.hidden) { if (Player.av) { try { webapis.avplay.suspend(); } catch (e) {} } }
  else if (Player.av && Player.active) { try { webapis.avplay.restore(); } catch (e) {} }
});

/* ---- shared API for media.js ---- */
var T = window.__tv = {
  $: $, el: el, esc: esc, mkErr: mkErr, Store: Store, I18N: I18N, t: t, applyLang: applyLang, xhr: xhr, normRelay: normRelay, relayOf: relayOf,
  go: go, toast: toast, Nav: Nav, Player: Player, Prefs: Prefs, savePrefs: savePrefs, Quality: Quality, S: S, hintBar: hintBar, hue: hue,
  showAccounts: showAccounts, saveAccounts: saveAccounts, enterLive: enterLive, loadLive: loadLive, openAccount: openAccount, showRelay: showSettings,
  showForm: showForm, Portal: Portal, Xtream: Xtream, cleanCmd: cleanCmd, stageMsg: stageMsg, SCREENS: SCREENS, errText: errText,
  getLang: function () { return lang; }, setLang: function (l) { lang = l; Store.set('lang', l); applyLang(); },
  loadEpg: function (c) { loadEpg(c); }, keys: {}, menu: { open: false, key: function () {} }, openHub: null, openMenu: null, typing: null
};

/* ---- boot (+ crash diagnostics: if the last run never exited cleanly, remember on which screen) ---- */
window.addEventListener('error', function (e) { try { Store.set('lastErr', { t: Date.now(), m: String(e && e.message || '').slice(0, 160), s: S.screen, l: (e && e.filename ? String(e.filename).split('/').pop() : '') + ':' + (e && e.lineno || 0) }); } catch (x) {} });
(function () {
  var r = Store.get('run', null);
  if (r && !r.bg) { Store.set('crash', { t: r.t, screen: r.screen }); T.crashed = r.screen; }
  Store.set('run', { t: Date.now(), screen: 'accounts' });
})();
applyLang();
T.qHtml = qHtml; T.dateTxt = dateTxt; T.clock2 = clockTxt2;
showAccounts();
if (T.crashed) setTimeout(function () { toast(t('crashed') + ' (' + T.crashed + ')', 4500); }, 800);
window.__stalker = { S: S, Nav: Nav };
})();
