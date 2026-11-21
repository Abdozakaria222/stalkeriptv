/* Minimal QR code encoder (byte mode, ECC level M, versions 1-10). No dependencies. */
(function () {
'use strict';
var EC = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
var EXP = [], LOG = [];
(function () { var x = 1, i; for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
function rsGen(n) { var p = [1], i, j; for (i = 0; i < n; i++) { var q = []; for (j = 0; j <= p.length; j++) q[j] = 0; for (j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= mul(p[j], EXP[i]); } p = q; } return p; }
function rsEcc(data, n) {
  var g = rsGen(n), r = [], i, j; for (i = 0; i < n; i++) r[i] = 0;
  for (i = 0; i < data.length; i++) { var f = data[i] ^ r[0]; r.shift(); r.push(0); if (f) for (j = 0; j < n; j++) r[j] ^= mul(g[j + 1], f); }
  return r;
}
function utf8(s) { var o = [], i, c; s = unescape(encodeURIComponent(s)); for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); o.push(c); } return o; }
function bit(v, i) { return (v >>> i) & 1; }

function encode(text) {
  var bytes = utf8(text), ver, ec, total, bits = [], i, j;
  for (ver = 1; ver <= 10; ver++) { ec = EC[ver]; total = ec[1] * ec[2] + ec[3] * ec[4]; var need = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8; if (need <= total * 8) break; }
  if (ver > 10) throw new Error('QR: text too long');
  function put(v, n) { for (var k = n - 1; k >= 0; k--) bits.push(bit(v, k)); }
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); for (i = 0; i < bytes.length; i++) put(bytes[i], 8);
  var cap = total * 8; for (i = 0; i < 4 && bits.length < cap; i++) bits.push(0); while (bits.length % 8) bits.push(0);
  var data = []; for (i = 0; i < bits.length; i += 8) { var b = 0; for (j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
  for (i = 0; data.length < total; i++) data.push(i % 2 ? 0x11 : 0xEC);
  var blocks = [], pos = 0, nb = ec[1] + ec[3];
  for (i = 0; i < nb; i++) { var len = i < ec[1] ? ec[2] : ec[4]; blocks.push(data.slice(pos, pos + len)); pos += len; }
  var eccs = blocks.map(function (bl) { return rsEcc(bl, ec[0]); }), out = [], maxd = Math.max(ec[2], ec[4]);
  for (i = 0; i < maxd; i++) blocks.forEach(function (bl) { if (i < bl.length) out.push(bl[i]); });
  for (i = 0; i < ec[0]; i++) eccs.forEach(function (e) { out.push(e[i]); });

  var size = ver * 4 + 17, M = [], F = [], y, x;
  for (y = 0; y < size; y++) { M[y] = []; F[y] = []; for (x = 0; x < size; x++) { M[y][x] = 0; F[y][x] = 0; } }
  function set(x, y, v) { if (x >= 0 && y >= 0 && x < size && y < size) { M[y][x] = v ? 1 : 0; F[y][x] = 1; } }
  function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); } }
  for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  var ap = ALIGN[ver], n = ap.length;
  for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  function formatBits(mask) {
    var d = (0 << 3) | mask, r = d, k; for (k = 0; k < 10; k++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bs = ((d << 10) | r) ^ 0x5412;
    for (k = 0; k <= 5; k++) set(8, k, bit(bs, k)); set(8, 7, bit(bs, 6)); set(8, 8, bit(bs, 7)); set(7, 8, bit(bs, 8));
    for (k = 9; k < 15; k++) set(14 - k, 8, bit(bs, k));
    for (k = 0; k < 8; k++) set(size - 1 - k, 8, bit(bs, k));
    for (k = 8; k < 15; k++) set(8, size - 15 + k, bit(bs, k));
    set(8, size - 8, 1);
  }
  formatBits(0);
  if (ver >= 7) { var r2 = ver, k2; for (k2 = 0; k2 < 12; k2++) r2 = (r2 << 1) ^ ((r2 >>> 11) * 0x1F25); var vb = (ver << 12) | r2; for (k2 = 0; k2 < 18; k2++) { var a = size - 11 + k2 % 3, bb = Math.floor(k2 / 3); set(a, bb, bit(vb, k2)); set(bb, a, bit(vb, k2)); } }
  var base = M.map(function (r) { return r.slice(); }), idx = 0, right, vert, jj, up;
  for (right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (vert = 0; vert < size; vert++) for (jj = 0; jj < 2; jj++) {
      x = right - jj; up = ((right + 1) & 2) === 0; y = up ? size - 1 - vert : vert;
      if (!F[y][x] && idx < out.length * 8) { base[y][x] = bit(out[idx >>> 3], 7 - (idx & 7)); idx++; }
    }
  }
  var MASKS = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return x * y % 2 + x * y % 3 === 0; },
    function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
  function applyMask(m) { var R = base.map(function (r) { return r.slice(); }), yy, xx; for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) if (!F[yy][xx] && MASKS[m](xx, yy)) R[yy][xx] ^= 1; return R; }
  function penalty(R) {
    var p = 0, yy, xx, run, k, dark = 0;
    function line(get) {
      var q = 0, r = 1, a, s;
      for (a = 1; a < size; a++) { if (get(a) === get(a - 1)) r++; else { if (r >= 5) q += 3 + r - 5; r = 1; } } if (r >= 5) q += 3 + r - 5;
      s = ''; for (a = 0; a < size; a++) s += get(a); var f = s.indexOf('10111010000'), g = s.indexOf('00001011101'), c = 0, o;
      for (o = s.indexOf('10111010000'); o >= 0; o = s.indexOf('10111010000', o + 1)) c++; for (o = s.indexOf('00001011101'); o >= 0; o = s.indexOf('00001011101', o + 1)) c++;
      return q + c * 40;
    }
    for (yy = 0; yy < size; yy++) { p += line(function (a) { return R[yy][a]; }); }
    for (xx = 0; xx < size; xx++) { p += line(function (a) { return R[a][xx]; }); }
    for (yy = 0; yy < size - 1; yy++) for (xx = 0; xx < size - 1; xx++) { var v = R[yy][xx]; if (v === R[yy][xx + 1] && v === R[yy + 1][xx] && v === R[yy + 1][xx + 1]) p += 3; }
    for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) dark += R[yy][xx];
    k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1; p += Math.max(0, k) * 10;
    return p;
  }
  var best = null, bs = 1e12, m;
  for (m = 0; m < 8; m++) { var R = applyMask(m), s = penalty(R); if (s < bs) { bs = s; best = { m: m, R: R }; } }
  // write chosen mask's format bits into the chosen matrix
  M = best.R; formatBits(best.m);
  return { size: size, modules: M, version: ver };
}

function svg(text, px) {
  var q = encode(text), n = q.size, quiet = 4, tot = n + quiet * 2, d = '', y, x;
  for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (q.modules[y][x]) d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + tot + ' ' + tot + '" shape-rendering="crispEdges"><rect width="' + tot + '" height="' + tot + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
}
window.QRCode = { encode: encode, svg: svg };
if (typeof module !== 'undefined') module.exports = window.QRCode;
})();
