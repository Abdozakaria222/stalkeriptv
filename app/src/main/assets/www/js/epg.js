/* Stalker TV — extra programme-guide sources (used only when the server's own short EPG is empty):
 *   1. Xtream get_simple_data_table / Stalker get_epg_info   (light, per channel / whole day)
 *   2. XMLTV file (your own URL in Settings, or the provider's xmltv.php for Xtream), read in small time slices
 *      and reduced to the next ~12 hours of the channels you actually have, so memory stays small. */
(function () {
'use strict';
var T = window.__tv, S = T.S, Store = T.Store, Prefs = T.Prefs;
var WIN_BACK = 3600, WIN_FWD = 14 * 3600, MAX_BYTES = 120 * 1024 * 1024, TTL = 6 * 3600 * 1000;

function b64(x) {
  try { var bin = atob(String(x || '')), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(a); }
  catch (e) { try { return decodeURIComponent(escape(atob(String(x || '')))); } catch (e2) { return String(x || ''); } }
}
function ent(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, function (m, g) {
    g = g.toLowerCase(); if (g === 'amp') return '&'; if (g === 'lt') return '<'; if (g === 'gt') return '>'; if (g === 'quot') return '"'; if (g === 'apos') return "'";
    var n = g.charAt(1) === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return isNaN(n) ? m : String.fromCharCode(n);
  });
}
function norm(n) {
  return String(n || '').toLowerCase().replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, ' ').replace(/\b(hd|fhd|uhd|sd|4k|hevc|h265|raw|backup)\b/g, ' ').replace(/[^a-z0-9؀-ۿ]+/g, '');
}
function pick(list) { // keep what epgNow needs
  var now = Date.now() / 1000; return list.filter(function (e) { return e.stop > now - 60; }).sort(function (a, b) { return a.start - b.start; }).slice(0, 6);
}

/* ---------- 1. server side alternatives ---------- */
var All = { t: 0, data: null, busy: null };
function stalkerAll() {
  if (All.data && Date.now() - All.t < 600000) return Promise.resolve(All.data);
  if (All.busy) return All.busy;
  All.busy = S.portal.call('itv', 'get_epg_info', { period: 6 }, true).then(function (js) {
    All.busy = null; All.data = (js && js.data) || {}; All.t = Date.now(); return All.data;
  }, function () { All.busy = null; return {}; });
  return All.busy;
}
function alt(ch) {
  var p = S.portal; if (!p) return Promise.resolve([]);
  if (S.acc.type === 'xtream') {
    return p.req('get_simple_data_table', { stream_id: ch.id }).then(function (j) {
      return pick(((j && j.epg_listings) || []).map(function (e) { return { name: b64(e.title), start: Number(e.start_timestamp) || 0, stop: Number(e.stop_timestamp || e.end_timestamp) || 0, desc: b64(e.description || '') }; }));
    }).catch(function () { return []; });
  }
  return stalkerAll().then(function (d) {
    var a = d && d[ch.id]; if (!a || !a.length) return [];
    return pick(a.map(function (e) { return { name: e.name || '', start: Number(e.start_timestamp) || 0, stop: Number(e.stop_timestamp) || 0, desc: e.descr || e.description || '' }; }));
  }).catch(function () { return []; });
}

/* ---------- 2. XMLTV ---------- */
var X = { st: 'idle', t: 0, key: '', map: {}, tok: 0 };
function xmltvUrl() {
  var u = String(Store.get('xmltv', '') || '').replace(/^\s+|\s+$/g, ''), a = S.acc;
  if (u) return /^https?:\/\//i.test(u) ? u : 'http://' + u;
  if (a && a.type === 'xtream' && S.portal && S.portal.base) return S.portal.base + '/xmltv.php?username=' + encodeURIComponent(a.user) + '&password=' + encodeURIComponent(a.pass);
  return '';
}
function fetchText(url) {
  return new Promise(function (res, rej) {
    var x = new XMLHttpRequest(); x.open('GET', url, true); x.timeout = 180000;
    x.onreadystatechange = function () { if (x.readyState === 2) { var n = Number(x.getResponseHeader('Content-Length')) || 0; if (n > MAX_BYTES) { x.abort(); rej(new Error('big')); } } };
    x.onprogress = function (e) { if (e && e.loaded > MAX_BYTES) { x.abort(); rej(new Error('big')); } };
    x.onload = function () { if (x.status >= 200 && x.status < 300) res(x.responseText); else rej(new Error('http')); };
    x.onerror = x.ontimeout = function () { rej(new Error('net')); };
    x.send();
  });
}
function fetchAny(url) {
  var rel = T.normRelay(Store.get('relay', ''));
  return fetchText(url).catch(function (e) { if (!rel || (e && e.message === 'big')) throw e; return fetchText(rel + '/?u=' + encodeURIComponent(url) + '&h=' + encodeURIComponent('{}')); });
}
function parseTime(s) {
  var m = String(s || '').match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-]\d{4})?/); if (!m) return 0;
  var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000, z = m[7];
  if (z) { var sg = z.charAt(0) === '-' ? -1 : 1; t -= sg * (Number(z.substr(1, 2)) * 3600 + Number(z.substr(3, 2)) * 60); }
  return t;
}
function attr(tag, k) { var m = tag.match(new RegExp('\\b' + k + '\\s*=\\s*"([^"]*)"')) || tag.match(new RegExp('\\b' + k + "\\s*=\\s*'([^']*)'")); return m ? ent(m[1]) : ''; }

function wanted() { // xml key (id or normalised name) -> our channel ids
  var w = {};
  S.channels.forEach(function (c) {
    var ks = []; if (c.epg) ks.push('i:' + c.epg.toLowerCase()); var n = norm(c.name); if (n) ks.push('n:' + n);
    ks.forEach(function (k) { (w[k] = w[k] || []).push(c.id); });
  });
  return w;
}
function build(txt, tok, done) {
  var w = wanted(), xml2our = {}, out = {}, now = Date.now() / 1000, pos = 0, phase = 0, a, b, tag, id;
  function link(xid, keys) {
    var ours = [], seen = {}; keys.forEach(function (k) { (w[k] || []).forEach(function (o) { if (!seen[o]) { seen[o] = 1; ours.push(o); } }); });
    if (ours.length) xml2our[xid] = ours;
  }
  function slice() {
    if (tok !== X.tok) return; var t0 = Date.now();
    while (Date.now() - t0 < 12) {
      if (phase === 0) { // <channel id="x"><display-name>..</display-name></channel>
        a = txt.indexOf('<channel', pos); var pg = txt.indexOf('<programme', pos);
        if (a < 0 || (pg >= 0 && pg < a)) { phase = 1; pos = pg < 0 ? txt.length : pg; continue; }
        b = txt.indexOf('</channel>', a); if (b < 0) { phase = 1; pos = a; continue; }
        var blk = txt.slice(a, b); id = attr(blk.slice(0, blk.indexOf('>') + 1), 'id'); var keys = ['i:' + id.toLowerCase()], re = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g, m;
        while ((m = re.exec(blk))) { var nn = norm(ent(m[1])); if (nn) keys.push('n:' + nn); }
        link(id, keys); pos = b + 10;
      } else {
        a = txt.indexOf('<programme', pos); if (a < 0) { finish(); return; }
        b = txt.indexOf('</programme>', a); if (b < 0) { finish(); return; }
        pos = b + 12;
        var gt = txt.indexOf('>', a); tag = txt.slice(a, gt + 1);
        var ours = xml2our[attr(tag, 'channel')]; if (!ours) continue;
        var st = parseTime(attr(tag, 'start')), sp = parseTime(attr(tag, 'stop')); if (!st || !sp || sp < now - WIN_BACK || st > now + WIN_FWD) continue;
        var tm = txt.slice(gt, b).match(/<title[^>]*>([\s\S]*?)<\/title>/), nm = tm ? ent(tm[1]).replace(/^\s+|\s+$/g, '') : ''; if (!nm) continue;
        var dm = txt.slice(gt, b).match(/<desc[^>]*>([\s\S]*?)<\/desc>/), e = { name: nm, start: st, stop: sp, desc: dm ? ent(dm[1]).replace(/^\s+|\s+$/g, '') : '' }, i; for (i = 0; i < ours.length; i++) (out[ours[i]] = out[ours[i]] || []).push(e);
      }
    }
    setTimeout(slice, 0);
  }
  function finish() { var k, n = 0; for (k in out) { out[k].sort(function (p, q) { return p.start - q.start; }); n++; } done(out, n); }
  slice();
}
function load() {
  var url = xmltvUrl(); if (!url || !S.channels.length) return;
  if (X.st === 'loading') return;
  if (X.st === 'ready' && X.key === url + '|' + S.acc.id && Date.now() - X.t < TTL) return;
  if (X.st === 'fail' && X.key === url + '|' + S.acc.id && Date.now() - X.t < 600000) return;
  var tok = ++X.tok; X.st = 'loading'; X.key = url + '|' + S.acc.id; X.t = Date.now();
  fetchAny(url).then(function (txt) {
    if (tok !== X.tok) return;
    build(txt, tok, function (map, n) {
      if (tok !== X.tok) return; txt = null;
      X.map = map; X.st = n ? 'ready' : 'fail'; X.t = Date.now();
      var c = S.playing; if (c) { delete S.epg[c.id]; T.loadEpg(c); }
    });
  }, function () { if (tok === X.tok) { X.st = 'fail'; X.t = Date.now(); } });
}
function fromX(ch) { var l = X.map[ch.id]; return l && l.length ? pick(l) : []; }

T.epgMore = function (ch) {
  return alt(ch).then(function (l) {
    if (l.length) return l;
    load(); return fromX(ch);
  });
};
T.epgReset = function () { X.tok++; X.st = 'idle'; X.map = {}; All.data = null; };
})();
