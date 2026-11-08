/* Stalker TV — subtitles: reads the subtitle track of the movie/episode, auto-translates every cue, draws it over the video.
 * (No speech recognition: it translates the subtitle text that the file itself carries.) */
(function () {
'use strict';
var T = window.__tv, t = T.t, Store = T.Store, Prefs = T.Prefs, Player = T.Player, S = T.S, esc = T.esc;

var AR = {
  subsT: 'الترجمة', subNative: 'ترجمة التلفزيون الأصلية', subTracks: 'مسارات', subCues: 'وصلت', subAuto: 'ترجمة تلقائية', subTo: 'لغة الترجمة', subBoth: 'عرض النص الأصلي مع الترجمة', subSize: 'حجم الترجمة', subNone: 'لا توجد ترجمة داخل هذا الملف',
  subOffItem: 'إيقاف الترجمة', subFail: 'تعذّرت الترجمة — يتم عرض النص الأصلي', subNote: 'تترجم نص الترجمة الموجود داخل الفيلم تلقائياً (لا تعرف الصوت). تحتاج اتصالاً بالإنترنت.',
  sizeM: 'متوسط', sizeL: 'كبير', sizeXL: 'كبير جداً', subTrack: 'مسار الترجمة', origLang: 'الأصلية'
};
var EN = {
  subsT: 'Subtitles', subNative: 'TV native subtitles', subTracks: 'tracks', subCues: 'cues', subAuto: 'Auto-translate', subTo: 'Translate to', subBoth: 'Show original text too', subSize: 'Subtitle size', subNone: 'This file has no subtitle track',
  subOffItem: 'Subtitles off', subFail: 'Translation failed — showing original text', subNote: 'Translates the subtitle text carried inside the movie (it cannot hear the audio). Needs internet.',
  sizeM: 'Medium', sizeL: 'Large', sizeXL: 'Extra large', subTrack: 'Subtitle track', origLang: 'Original'
};
(function () { var k; for (k in AR) T.I18N.ar[k] = AR[k]; for (k in EN) T.I18N.en[k] = EN[k]; })();

var LANGS = [['ar', 'العربية'], ['en', 'English'], ['fr', 'Français'], ['tr', 'Türkçe'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano'], ['ru', 'Русский'], ['pt', 'Português'], ['fa', 'فارسی'], ['ku', 'Kurdî'],
  ['ur', 'اردو'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['id', 'Indonesia'], ['ms', 'Melayu'], ['th', 'ไทย'], ['vi', 'Tiếng Việt'], ['zh-CN', '中文'], ['ja', '日本語'], ['ko', '한국어'],
  ['nl', 'Nederlands'], ['pl', 'Polski'], ['uk', 'Українська'], ['ro', 'Română'], ['el', 'Ελληνικά'], ['iw', 'עברית'], ['sv', 'Svenska'], ['da', 'Dansk'], ['no', 'Norsk'], ['fi', 'Suomi'],
  ['cs', 'Čeština'], ['hu', 'Magyar'], ['bg', 'Български'], ['sr', 'Српски'], ['hr', 'Hrvatski'], ['sq', 'Shqip'], ['az', 'Azərbaycan'], ['hy', 'Հայերեն'], ['ka', 'ქართული'], ['so', 'Soomaali'], ['sw', 'Kiswahili'], ['am', 'አማርኛ'], ['ps', 'پښتو']];
var ISO3 = { eng: 'en', ara: 'ar', fre: 'fr', fra: 'fr', spa: 'es', ger: 'de', deu: 'de', tur: 'tr', ita: 'it', rus: 'ru', por: 'pt', per: 'fa', fas: 'fa', kur: 'ku', hin: 'hi', jpn: 'ja', kor: 'ko', chi: 'zh', zho: 'zh' };
function code2(l) { l = String(l || '').toLowerCase().replace(/[^a-z]/g, ''); if (l === 'he') l = 'iw'; if (l.length === 2) return l; return ISO3[l.substr(0, 3)] || l.substr(0, 2); }
function langName(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === c) return LANGS[i][1]; return c ? c.toUpperCase() : ''; }
var SIZES = { m: 40, l: 50, xl: 62 };

var DEF_EP = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={tl}&dt=t&q={q}';
var Subs = {
  LANGS: LANGS, langName: langName, SIZES: SIZES,
  gen: 0, rg: 0, cues: 0, native: false, cache: {}, tracks: [], sel: -1, active: false, fails: 0, warned: false, hideT: 0, slowT: 0, el: null, via: '',
  /* ---------- overlay ---------- */
  mount: function () { if (!this.el) this.el = T.$('#subs'); return this.el; },
  applyStyle: function () { var e = this.mount(); if (e) e.style.fontSize = (SIZES[Prefs.subSize] || 40) + 'px'; },
  draw: function (main, orig) {
    var e = this.mount(); if (!e) return; this.applyStyle();
    if (!main || (S.screen !== 'full' && S.screen !== 'vod')) { e.style.display = 'none'; e.innerHTML = ''; return; }
    e.innerHTML = '<div class="sm">' + esc(main).replace(/\n/g, '<br>') + '</div>' + (orig ? '<div class="so">' + esc(orig).replace(/\n/g, '<br>') + '</div>' : '');
    e.style.display = 'block';
  },
  clear: function () { clearTimeout(this.hideT); clearTimeout(this.slowT); this.draw(''); },
  /* ---------- lifecycle ---------- */
  reset: function () { this.gen++; this.rg++; this.cues = 0; this.native = false; this.clear(); this.tracks = []; this.sel = -1; this.active = false; this.fails = 0; this.warned = false; },
  stop: function () { this.reset(); },
  /* called when playback is ready: finds embedded subtitle tracks and picks the best one */
  ready: function (n) {
    var self = this, rg = this.rg; n = n || 0;
    this.tracks = Player.tracks('TEXT').map(function (x) { return { index: x.index, lang: code2(x.label), label: x.label }; });
    if (!this.tracks.length) {
      // the TV draws its own subtitles when we have nothing to translate; tracks of some streams only appear a few seconds after start
      this.active = false; this.setNative(true, true);
      if (n < 3) setTimeout(function () { if (rg === self.rg && !self.tracks.length) self.ready(n + 1); }, [2500, 4500, 8000][n]);
      return;
    }
    if (!Prefs.subs) { this.active = false; this.setNative(true, true); return; }
    var want = Prefs.subLang, pick = null;
    this.tracks.forEach(function (x) { if (!pick && x.lang === want) pick = x; });
    this.tracks.forEach(function (x) { if (!pick && x.lang === 'en') pick = x; });
    pick = pick || this.tracks[0]; this.pick(pick, true);
    T.toast(t('subsT') + ': ' + (pick.lang ? langName(pick.lang) : pick.label) + ' → ' + langName(Prefs.subLang), 2200);
  },
  /* native = let the TV render the subtitle itself (silent mode off) */
  setNative: function (on, quiet) {
    this.native = !!on; if (on) { this.clear(); this.gen++; }
    if (Player.av) { try { webapis.avplay.setSilentSubtitle(!on); } catch (e) {} }
    if (!quiet) T.toast(t('subNative') + ': ' + (on ? t('on') : t('off')), 1600);
  },
  diag: function () { return (Player.av ? 'AVPlay' : 'HTML5') + ' · ' + t('subTracks') + ': ' + this.tracks.length + (this.tracks.length ? ' (' + this.tracks.map(function (x) { return x.lang || x.label; }).join(', ') + ')' : '') + ' · ' + t('subCues') + ': ' + this.cues; },
  pick: function (tr, quiet) {
    this.sel = tr.index; this.active = true; this.native = false; this.clear(); this.gen++;
    Player.selectTrack('TEXT', tr.index);
    if (Player.av) { try { webapis.avplay.setSilentSubtitle(true); } catch (e) {} }
    if (!quiet) T.toast(t('subsT') + ': ' + (tr.lang ? langName(tr.lang) : tr.label), 1600);
  },
  off: function () { this.active = false; this.clear(); this.gen++; Prefs.subs = false; T.savePrefs(); this.setNative(true, true); },
  on: function () { Prefs.subs = true; T.savePrefs(); this.ready(); },
  /* ---------- cue handling (one cue at a time) ---------- */
  cue: function (text, dur) {
    var self = this; text = this.norm(text); this.gen++; var g = this.gen; if (text) this.cues++;
    clearTimeout(this.hideT); clearTimeout(this.slowT);
    if (!text) { this.draw(''); return; }
    if (!this.active || !Prefs.subs) { this.draw(text); this.hideT = setTimeout(function () { self.draw(''); }, dur > 0 ? dur : 4000); return; }
    this.hideT = setTimeout(function () { if (g === self.gen) self.draw(''); }, dur > 0 ? dur + 200 : 4500);
    var hit = this.cached(text);
    if (hit) { this.show(text, hit); return; }
    // translation usually returns in a fraction of a second; if it is slow, show the original meanwhile
    this.slowT = setTimeout(function () { if (g === self.gen) self.draw(text); }, 700);
    this.translate(text, function (res) {
      if (g !== self.gen) return; clearTimeout(self.slowT);
      if (res === null) { self.fails++; if (self.fails >= 2 && !self.warned) { self.warned = true; T.toast(t('subFail'), 2600); } self.draw(text); return; }
      self.fails = 0; self.show(text, res);
    });
  },
  show: function (orig, res) { if (res.same || !res.text) this.draw(orig); else this.draw(res.text, Prefs.subBoth ? orig : ''); },
  norm: function (s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/g, ''); },
  key: function (text) { return Prefs.subLang + '|' + text; },
  cached: function (text) { return this.cache[this.key(text)] || null; },
  endpoint: function () { return Store.get('tr_endpoint', DEF_EP) || DEF_EP; },
  translate: function (text, cb) {
    var self = this, k = this.key(text), tl = Prefs.subLang;
    var url = this.endpoint().replace('{tl}', encodeURIComponent(tl)).replace('{q}', encodeURIComponent(text));
    var rel = T.normRelay(Store.get('relay', '')), order = (rel && this.via === 'relay') ? ['relay', 'direct'] : (rel ? ['direct', 'relay'] : ['direct']), i = 0;
    function parse(txt) {
      var j = JSON.parse(txt), out = '', k2; if (!j || !j[0]) throw 0;
      for (k2 = 0; k2 < j[0].length; k2++) if (j[0][k2] && j[0][k2][0]) out += j[0][k2][0];
      return { text: out, same: code2(j[2]) === code2(tl) };
    }
    function next() {
      if (i >= order.length) { cb(null); return; }
      var mode = order[i++], u = mode === 'relay' ? rel + '/?u=' + encodeURIComponent(url) + '&h=' + encodeURIComponent('{}') : url;
      T.xhr(u, {}, 8000).then(function (txt) {
        var r; try { r = parse(txt); } catch (e) { next(); return; }
        self.via = mode; var n = 0; for (var kk in self.cache) n++; if (n > 600) self.cache = {};
        self.cache[k] = r; cb(r);
      }, function () { next(); });
    }
    next();
  },
  /* ---------- player menu items ---------- */
  menuItems: function () {
    var it = [], self = this;
    it.push({ hdr: true, l: t('subsT') });
    it.push({ l: this.diag(), dis: true });
    it.push({ l: t('subNative') + ': ' + (this.native ? t('on') : t('off')), subNative: 1, sel: this.native });
    it.push({ l: t('subAuto') + ': ' + (Prefs.subs ? t('on') : t('off')), subToggle: 1, sel: Prefs.subs });
    if (!this.tracks.length) it.push({ l: t('subNone'), dis: true });
    else { it.push({ hdr: true, l: t('subTrack') }); this.tracks.forEach(function (x) { it.push({ l: (x.lang ? langName(x.lang) : x.label) + (x.lang === Prefs.subLang ? ' (' + t('origLang') + ')' : ''), subTrack: x, sel: self.active && self.sel === x.index }); }); }
    it.push({ hdr: true, l: t('subTo') });
    LANGS.forEach(function (x) { it.push({ l: x[1], subLang: x[0], sel: Prefs.subLang === x[0] }); });
    return it;
  },
  menuAct: function (x) {
    if (x.subNative) { this.setNative(!this.native); return true; }
    if (x.subToggle) { if (Prefs.subs) this.off(); else this.on(); return true; }
    if (x.subLang) { Prefs.subLang = x.subLang; Prefs.subs = true; T.savePrefs(); this.gen++; this.clear(); if (!this.active) this.ready(); T.toast(t('subTo') + ': ' + x.l, 1600); return true; }
    if (x.subTrack) { Prefs.subs = true; T.savePrefs(); this.pick(x.subTrack); return true; }
    return false;
  }
};
T.Subs = Subs;
})();
