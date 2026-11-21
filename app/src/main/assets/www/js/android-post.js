/* Stalker TV (Android build) - runs after the app. With the VLC engine the subtitles are drawn by VLC itself:
 * the subtitle menu then lists the file's own subtitle tracks (+ off) and the timing rows move VLC's subtitles. */
(function () {
'use strict';
var T = window.__tv, AP = window.AndroidPlayer;
if (!T || !AP || !window.ANDROID_APP || !T.Subs) return;
var S = T.Subs, t = T.t, oReady = S.ready, oItems = S.menuItems, oAct = S.menuAct;
function vlcNow() { return window.__aeng === 'vlc'; }
S.ready = function () {
  if (!vlcNow()) return oReady.apply(this, arguments);
  this.active = false; this.native = true; this.sel = -1;      // VLC shows the file's subtitles (Arabic first when the file has it)
};
S.menuItems = function () {
  if (!vlcNow()) return oItems.apply(this, arguments);
  var it = [{ hdr: true, l: t('subsT') }], tr = T.Player.tracks('TEXT');
  it.push({ l: t('subTiming') + ': ' + this.fmtOff(), dis: true }, { l: '◀  ' + t('subEarlier'), subShift: -500 }, { l: t('subLater') + '  ▶', subShift: 500 });
  if (this.offset) it.push({ l: t('subResetT'), subShift: 0 });
  if (!tr.length) it.push({ l: t('subNone'), dis: true });
  else {
    it.push({ hdr: true, l: t('subTrack') });
    it.push({ l: t('off'), vspu: -1, sel: S.sel === -2 });
    tr.forEach(function (x) { it.push({ l: x.label, vspu: x.index, sel: S.sel === x.index }); });
  }
  return it;
};
S.menuAct = function (x) {
  if (x && x.vspu !== undefined && vlcNow()) {
    if (x.vspu < 0) { AP.spuOff(); S.sel = -2; } else { T.Player.selectTrack('TEXT', x.vspu); S.sel = x.vspu; }
    T.toast(t('subsT') + ': ' + x.l, 1600); return true;
  }
  return oAct.apply(this, arguments);
};
})();
