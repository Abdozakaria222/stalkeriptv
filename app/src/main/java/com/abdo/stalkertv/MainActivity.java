package com.abdo.stalkertv;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.text.Cue;
import androidx.media3.common.text.CueGroup;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.util.VLCVideoLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final long MAX_BODY = 120L * 1024 * 1024;

    private WebView web;
    private PlayerView pv;
    private ExoPlayer player;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private float density = 1f;

    private volatile long dur = 0;
    private volatile String tracksJson = "[]";
    private boolean prepared = false;
    private boolean silentSub = true;
    private boolean wasPlaying = false;
    private final List<Tracks.Group> audioG = new ArrayList<>();
    private final List<Tracks.Group> textG = new ArrayList<>();

    /* VLC built into the app (libVLC). Used when the app's engine setting is VLC; ExoPlayer otherwise or when VLC cannot open a stream */
    private static final String UA = "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 StalkerTV/3";
    private VLCVideoLayout vlcView;
    private LibVLC libVlc;
    private org.videolan.libvlc.MediaPlayer vlc;
    private boolean vlcAttached = false, wantVlc = true, usingVlc = false, vlcBuf = false, vlcFailed = false;
    private String curUrl = null, resizeMode = "fit";
    private final List<Integer> vAudioIds = new ArrayList<>();
    private final List<Integer> vSpuIds = new ArrayList<>();

    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private final ConcurrentHashMap<Integer, String> bodies = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Integer, HttpURLConnection> conns = new ConcurrentHashMap<>();

    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            if (usingVlc) {
                if (vlc != null && prepared && vlc.isPlaying()) js("window.__avp&&__avp.ev('time'," + vlc.getTime() + ")");
            } else if (player != null && prepared && player.isPlaying()) {
                js("window.__avp&&__avp.ev('time'," + player.getCurrentPosition() + ")");
            }
            ui.postDelayed(this, 500);
        }
    };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);
        density = getResources().getDisplayMetrics().density;
        web = (WebView) findViewById(R.id.web);
        pv = (PlayerView) findViewById(R.id.player);
        pv.setVisibility(View.INVISIBLE);
        vlcView = (VLCVideoLayout) findViewById(R.id.vlc);
        vlcView.setVisibility(View.INVISIBLE);
        if (pv.getSubtitleView() != null) pv.getSubtitleView().setVisibility(View.GONE);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHorizontalScrollBarEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.addJavascriptInterface(new PlayerApi(), "AndroidPlayer");
        web.addJavascriptInterface(new NetApi(), "AndroidNet");
        web.loadUrl("file:///android_asset/www/index.html");
        hideSystemUi();
        ui.postDelayed(ticker, 500);
    }

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideSystemUi(); }

    @Override protected void onPause() {
        super.onPause();
        if (usingVlc && vlc != null) { wasPlaying = vlc.isPlaying(); if (wasPlaying) vlc.pause(); }
        else if (player != null) { wasPlaying = player.getPlayWhenReady(); player.setPlayWhenReady(false); }
        web.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        web.onResume();
        if (usingVlc && vlc != null) { if (wasPlaying) vlc.play(); }
        else if (player != null && wasPlaying) player.setPlayWhenReady(true);
    }

    @Override protected void onDestroy() {
        ui.removeCallbacks(ticker);
        releasePlayer();
        if (vlc != null) { try { vlc.setEventListener(null); if (vlcAttached) vlc.detachViews(); vlc.release(); } catch (Throwable ignored) { } vlc = null; }
        if (libVlc != null) { try { libVlc.release(); } catch (Throwable ignored) { } libVlc = null; }
        pool.shutdownNow();
        super.onDestroy();
    }

    /* remote / hardware keys the web app knows as TV keys */
    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = 0;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_BACK: code = 27; break;
            case 166: code = 427; break;              // channel up
            case 167: code = 428; break;              // channel down
            case 183: code = 403; break;              // red
            case 184: code = 404; break;              // green
            case 185: code = 405; break;              // yellow
            case 186: code = 406; break;              // blue
            case 165: code = 457; break;              // info
            case 85: code = 10252; break;             // play/pause
            case 126: code = 415; break;              // play
            case 127: code = 19; break;               // pause
            case 86: code = 413; break;               // stop
            case 90: code = 417; break;               // fast forward
            case 89: code = 412; break;               // rewind
            default: break;
        }
        if (code != 0) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) js("window.__key&&__key(" + code + ")");
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private void js(final String s) {
        ui.post(new Runnable() { @Override public void run() { if (web != null) web.evaluateJavascript(s, null); } });
    }

    private void releasePlayer() {
        if (player != null) { try { player.release(); } catch (Exception ignored) { } player = null; }
        if (vlc != null && usingVlc) { try { vlc.stop(); } catch (Throwable ignored) { } }
        usingVlc = false; vlcBuf = false; vAudioIds.clear(); vSpuIds.clear();
        if (vlcView != null) vlcView.setVisibility(View.INVISIBLE);
        prepared = false; dur = 0; tracksJson = "[]";
        audioG.clear(); textG.clear();
        if (pv != null) { pv.setPlayer(null); pv.setVisibility(View.INVISIBLE); }
    }

    private void rebuildTracks(Tracks t) {
        audioG.clear(); textG.clear();
        JSONArray arr = new JSONArray();
        try {
            for (Tracks.Group g : t.getGroups()) {
                int type = g.getType(); String name;
                List<Tracks.Group> list;
                if (type == C.TRACK_TYPE_AUDIO) { name = "AUDIO"; list = audioG; }
                else if (type == C.TRACK_TYPE_TEXT) { name = "TEXT"; list = textG; }
                else continue;
                if (g.length == 0) continue;
                String lang = g.getTrackFormat(0).language;
                if (lang == null || lang.length() == 0) lang = g.getTrackFormat(0).label == null ? "" : g.getTrackFormat(0).label;
                JSONObject o = new JSONObject();
                o.put("type", name); o.put("index", list.size());
                o.put("extra_info", new JSONObject().put("language", lang).toString());
                arr.put(o); list.add(g);
            }
        } catch (Exception ignored) { }
        tracksJson = arr.toString();
    }

    /* ======================= VLC ======================= */
    private boolean ensureVlc() {
        if (vlc != null) return true;
        if (vlcFailed) return false;
        try {
            ArrayList<String> o = new ArrayList<>();
            o.add("--http-reconnect");
            o.add("--sub-language=ara,eng");
            o.add("--no-stats");
            o.add("--no-osd");
            libVlc = new LibVLC(this, o);
            vlc = new org.videolan.libvlc.MediaPlayer(libVlc);
            vlc.setEventListener(vlcEvents);
            return true;
        } catch (Throwable t) {                     // no native VLC for this processor: ExoPlayer only
            vlcFailed = true; vlc = null; libVlc = null;
            return false;
        }
    }

    private static boolean isLive(String u) {
        String l = u.toLowerCase();
        return l.contains("/live/") || ((l.contains(".m3u8") || l.endsWith(".ts")) && !l.contains("/movie/") && !l.contains("/series/"));
    }

    private boolean openVlc(String url) {
        if (!ensureVlc()) return false;
        try {
            if (!vlcAttached) { vlc.attachViews(vlcView, null, true, false); vlcAttached = true; }
            Media m = new Media(libVlc, Uri.parse(url));
            m.setHWDecoderEnabled(true, false);
            m.addOption(":network-caching=" + (isLive(url) ? 3000 : 1500));
            m.addOption(":http-user-agent=" + UA);
            m.addOption(":http-reconnect");
            vlc.setMedia(m);
            m.release();
            prepared = false; dur = 0; tracksJson = "[]"; vlcBuf = false;
            usingVlc = true;
            applyVlcScale();
            pv.setVisibility(View.INVISIBLE);
            vlcView.setVisibility(View.VISIBLE);
            return true;
        } catch (Throwable t) {
            usingVlc = false;
            return false;
        }
    }

    private void applyVlcScale() {
        if (vlc == null) return;
        try {
            vlc.setVideoScale("fill".equals(resizeMode) ? org.videolan.libvlc.MediaPlayer.ScaleType.SURFACE_FILL
                    : "zoom".equals(resizeMode) ? org.videolan.libvlc.MediaPlayer.ScaleType.SURFACE_FIT_SCREEN
                    : org.videolan.libvlc.MediaPlayer.ScaleType.SURFACE_BEST_FIT);
        } catch (Throwable ignored) { }
    }

    private void addVlcTracks(JSONArray arr, String type, org.videolan.libvlc.MediaPlayer.TrackDescription[] list, List<Integer> ids) throws Exception {
        ids.clear();
        if (list == null) return;
        for (org.videolan.libvlc.MediaPlayer.TrackDescription d : list) {
            if (d.id < 0) continue;                  // "Disable"
            JSONObject o = new JSONObject();
            o.put("type", type); o.put("index", ids.size());
            o.put("extra_info", new JSONObject().put("language", d.name == null ? "" : d.name).toString());
            arr.put(o); ids.add(d.id);
        }
    }

    private void vlcTracks() {
        if (vlc == null) return;
        try {
            JSONArray arr = new JSONArray();
            addVlcTracks(arr, "AUDIO", vlc.getAudioTracks(), vAudioIds);
            addVlcTracks(arr, "TEXT", vlc.getSpuTracks(), vSpuIds);
            tracksJson = arr.toString();
        } catch (Throwable ignored) { }
    }

    /* VLC could not open the stream before it started: ExoPlayer takes over the same stream */
    private void vlcFallback() {
        String u = curUrl;
        try { vlc.stop(); } catch (Throwable ignored) { }
        usingVlc = false; vlcView.setVisibility(View.INVISIBLE);
        if (u == null) return;
        openExo(u);
        js("__avp.ev('engine','exo','fb')");
        if (player != null) player.prepare();
    }

    private final org.videolan.libvlc.MediaPlayer.EventListener vlcEvents = new org.videolan.libvlc.MediaPlayer.EventListener() {
        @Override public void onEvent(org.videolan.libvlc.MediaPlayer.Event ev) {
            if (!usingVlc || vlc == null) return;
            switch (ev.type) {
                case org.videolan.libvlc.MediaPlayer.Event.Playing: {
                    long l = vlc.getLength(); if (l > 0) dur = l;
                    vlcTracks();
                    if (!prepared) { prepared = true; js("__avp.ev('prepared')"); }
                    else if (vlcBuf) { vlcBuf = false; js("__avp.ev('bufend')"); }
                    break;
                }
                case org.videolan.libvlc.MediaPlayer.Event.Buffering: {
                    if (!prepared) break;
                    boolean b = ev.getBuffering() < 100f;
                    if (b != vlcBuf) { vlcBuf = b; js(b ? "__avp.ev('bufstart')" : "__avp.ev('bufend')"); }
                    break;
                }
                case org.videolan.libvlc.MediaPlayer.Event.LengthChanged: { long l = ev.getLengthChanged(); if (l > 0) dur = l; break; }
                case org.videolan.libvlc.MediaPlayer.Event.ESAdded:
                case org.videolan.libvlc.MediaPlayer.Event.ESDeleted:
                case org.videolan.libvlc.MediaPlayer.Event.ESSelected: vlcTracks(); break;
                case org.videolan.libvlc.MediaPlayer.Event.EndReached: js("__avp.ev('completed')"); break;
                case org.videolan.libvlc.MediaPlayer.Event.EncounteredError:
                    if (!prepared) vlcFallback(); else js("__avp.ev('error','VLC: playback error')");
                    break;
                default: break;
            }
        }
    };

    private void openExo(String url) {
        DefaultHttpDataSource.Factory ds = new DefaultHttpDataSource.Factory()
                .setUserAgent(UA)
                .setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(15000).setReadTimeoutMs(20000);
        DefaultLoadControl lc = new DefaultLoadControl.Builder().setBufferDurationsMs(5000, 50000, 1000, 2500).build();
        player = new ExoPlayer.Builder(MainActivity.this)
                .setRenderersFactory(new DefaultRenderersFactory(MainActivity.this).setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON))
                .setMediaSourceFactory(new DefaultMediaSourceFactory(ds))
                .setLoadControl(lc).build();
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int st) {
                if (st == Player.STATE_READY) {
                    long d = player == null ? 0 : player.getDuration();
                    dur = d == C.TIME_UNSET ? 0 : d;
                    if (!prepared) { prepared = true; js("__avp.ev('prepared')"); } else js("__avp.ev('bufend')");
                } else if (st == Player.STATE_BUFFERING) { if (prepared) js("__avp.ev('bufstart')"); }
                else if (st == Player.STATE_ENDED) js("__avp.ev('completed')");
            }
            @Override public void onPlayerError(PlaybackException err) {
                js("__avp.ev('error'," + JSONObject.quote(err.getErrorCodeName() + ": " + String.valueOf(err.getMessage())) + ")");
            }
            @Override public void onTracksChanged(Tracks t) { rebuildTracks(t); }
            @Override public void onCues(CueGroup g) {
                StringBuilder sb = new StringBuilder();
                for (Cue c : g.cues) { if (c.text != null) { if (sb.length() > 0) sb.append('\n'); sb.append(c.text.toString()); } }
                js("__avp.ev('sub',4000," + JSONObject.quote(sb.toString()) + ")");
            }
        });
        pv.setPlayer(player);
        pv.setResizeMode("fill".equals(resizeMode) ? AspectRatioFrameLayout.RESIZE_MODE_FILL : "zoom".equals(resizeMode) ? AspectRatioFrameLayout.RESIZE_MODE_ZOOM : AspectRatioFrameLayout.RESIZE_MODE_FIT);
        pv.setVisibility(View.VISIBLE);
        if (pv.getSubtitleView() != null) pv.getSubtitleView().setVisibility(silentSub ? View.GONE : View.VISIBLE);
        player.setMediaItem(MediaItem.fromUri(url));
        player.setPlayWhenReady(false);
    }

    /* ======================= AVPlay-like player ======================= */
    private class PlayerApi {
        @JavascriptInterface public void setEngine(final String e) { wantVlc = !"exo".equals(e); }
        @JavascriptInterface public void open(final String url) {
            ui.post(new Runnable() { @Override public void run() {
                releasePlayer();
                curUrl = url;
                if (wantVlc && openVlc(url)) { js("__avp.ev('engine','vlc')"); return; }
                openExo(url);
                js("__avp.ev('engine','exo')");
            } });
        }
        @JavascriptInterface public void prepare() { ui.post(new Runnable() { @Override public void run() { if (usingVlc) { if (vlc != null) vlc.play(); } else if (player != null) player.prepare(); } }); }
        @JavascriptInterface public void play() { ui.post(new Runnable() { @Override public void run() { if (usingVlc) { if (vlc != null && !vlc.isPlaying()) vlc.play(); } else if (player != null) player.setPlayWhenReady(true); } }); }
        @JavascriptInterface public void pause() { ui.post(new Runnable() { @Override public void run() { if (usingVlc) { if (vlc != null && vlc.isPlaying()) vlc.pause(); } else if (player != null) player.setPlayWhenReady(false); } }); }
        @JavascriptInterface public void stop() { ui.post(new Runnable() { @Override public void run() { if (usingVlc) { if (vlc != null) vlc.stop(); } else if (player != null) player.stop(); } }); }
        @JavascriptInterface public void close() { ui.post(new Runnable() { @Override public void run() { releasePlayer(); } }); }
        @JavascriptInterface public void seek(final double ms) { ui.post(new Runnable() { @Override public void run() { if (usingVlc) { if (vlc != null) vlc.setTime((long) ms); } else if (player != null) player.seekTo((long) ms); } }); }
        @JavascriptInterface public void spuDelay(final double ms) { ui.post(new Runnable() { @Override public void run() { if (usingVlc && vlc != null) vlc.setSpuDelay((long) (ms * 1000)); } }); }
        @JavascriptInterface public void spuOff() { ui.post(new Runnable() { @Override public void run() { if (usingVlc && vlc != null) vlc.setSpuTrack(-1); } }); }
        @JavascriptInterface public double duration() { return (double) dur; }
        @JavascriptInterface public String tracks() { return tracksJson; }
        @JavascriptInterface public void selectTrack(final String type, final int idx) {
            ui.post(new Runnable() { @Override public void run() {
                if (usingVlc) {
                    if (vlc == null) return;
                    List<Integer> ids = "AUDIO".equals(type) ? vAudioIds : vSpuIds;
                    if (idx < 0 || idx >= ids.size()) return;
                    if ("AUDIO".equals(type)) vlc.setAudioTrack(ids.get(idx)); else vlc.setSpuTrack(ids.get(idx));
                    return;
                }
                if (player == null) return;
                boolean audio = "AUDIO".equals(type);
                List<Tracks.Group> list = audio ? audioG : textG;
                if (idx < 0 || idx >= list.size()) return;
                int ct = audio ? C.TRACK_TYPE_AUDIO : C.TRACK_TYPE_TEXT;
                TrackSelectionParameters p = player.getTrackSelectionParameters().buildUpon()
                        .setTrackTypeDisabled(ct, false)
                        .setOverrideForType(new TrackSelectionOverride(list.get(idx).getMediaTrackGroup(), 0)).build();
                player.setTrackSelectionParameters(p);
            } });
        }
        @JavascriptInterface public void silentSub(final boolean silent) {
            ui.post(new Runnable() { @Override public void run() {
                silentSub = silent;
                if (usingVlc) return;
                if (pv.getSubtitleView() != null) pv.getSubtitleView().setVisibility(silent ? View.GONE : View.VISIBLE);
            } });
        }
        @JavascriptInterface public void setResize(final String mode) {
            ui.post(new Runnable() { @Override public void run() {
                resizeMode = mode == null ? "fit" : mode;
                pv.setResizeMode("fill".equals(mode) ? AspectRatioFrameLayout.RESIZE_MODE_FILL : "zoom".equals(mode) ? AspectRatioFrameLayout.RESIZE_MODE_ZOOM : AspectRatioFrameLayout.RESIZE_MODE_FIT);
                if (usingVlc) applyVlcScale();
            } });
        }
        @JavascriptInterface public void setRect(final double l, final double t, final double w, final double h) {
            ui.post(new Runnable() { @Override public void run() {
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.max(1, Math.round((float) (w * density))), Math.max(1, Math.round((float) (h * density))));
                lp.leftMargin = Math.round((float) (l * density)); lp.topMargin = Math.round((float) (t * density));
                pv.setLayoutParams(lp);
                FrameLayout.LayoutParams lv = new FrameLayout.LayoutParams(lp.width, lp.height);
                lv.leftMargin = lp.leftMargin; lv.topMargin = lp.topMargin;
                vlcView.setLayoutParams(lv);
            } });
        }
        @JavascriptInterface public void exit() { ui.post(new Runnable() { @Override public void run() { finish(); } }); }
    }

    /* ======================= HTTP for the web app ======================= */
    private class NetApi {
        @JavascriptInterface public String body(int id) { String s = bodies.remove(id); return s == null ? "" : s; }
        @JavascriptInterface public void cancel(int id) { HttpURLConnection c = conns.remove(id); if (c != null) { try { c.disconnect(); } catch (Exception ignored) { } } }
        @JavascriptInterface public void request(final int id, final String method, final String url, final String headers, final int timeout) {
            pool.execute(new Runnable() { @Override public void run() { doRequest(id, method, url, headers, timeout); } });
        }
    }

    private void doRequest(int id, String method, String url, String headersJson, int timeout) {
        int status = -1; String hdrs = "{}";
        try {
            String cur = url; HttpURLConnection c = null;
            for (int hop = 0; hop < 6; hop++) {
                c = (HttpURLConnection) new URL(cur).openConnection();
                conns.put(id, c);
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(Math.min(timeout, 20000)); c.setReadTimeout(timeout);
                c.setRequestMethod(method == null ? "GET" : method);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 StalkerTV/3");
                try {
                    JSONObject h = new JSONObject(headersJson == null ? "{}" : headersJson);
                    Iterator<String> it = h.keys();
                    while (it.hasNext()) { String k = it.next(); c.setRequestProperty(k, h.optString(k)); }
                } catch (Exception ignored) { }
                int code = c.getResponseCode();
                if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                    cur = new URL(new URL(cur), c.getHeaderField("Location")).toString(); c.disconnect(); continue;
                }
                break;
            }
            status = c.getResponseCode();
            JSONObject ho = new JSONObject();
            for (Map.Entry<String, List<String>> en : c.getHeaderFields().entrySet()) {
                if (en.getKey() != null && !en.getValue().isEmpty()) ho.put(en.getKey().toLowerCase(), en.getValue().get(0));
            }
            hdrs = ho.toString();
            InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (in != null) {
                byte[] buf = new byte[65536]; int n; long total = 0;
                while ((n = in.read(buf)) > 0) { total += n; if (total > MAX_BODY) { status = -1; break; } out.write(buf, 0, n); }
                in.close();
            }
            if (status >= 0) {
                String ct = c.getContentType(), cs = "UTF-8";
                if (ct != null && ct.toLowerCase().contains("charset=")) cs = ct.substring(ct.toLowerCase().indexOf("charset=") + 8).replace("\"", "").trim();
                Charset charset; try { charset = Charset.forName(cs); } catch (Exception e) { charset = Charset.forName("UTF-8"); }
                bodies.put(id, new String(out.toByteArray(), charset));
            }
        } catch (SocketTimeoutException e) { status = -2; }
        catch (Exception e) { status = -1; }
        conns.remove(id);
        final int st = status; final String hh = hdrs; final int rid = id;
        js("window.__net&&__net.done(" + rid + "," + st + "," + JSONObject.quote(hh) + ")");
    }
}
