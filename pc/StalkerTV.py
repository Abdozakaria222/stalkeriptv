#!/usr/bin/env python3
"""Stalker TV for PC - a tiny local server (Python 3 standard library only).

It serves the very same app that runs on the Samsung TV and adds two things a browser cannot do alone:
  * /p      a pass-through proxy (removes the browser's CORS / forbidden-header limits, keeps Range for seeking)
  * /play   plays anything (HLS, MPEG-TS, MKV, AC3 audio ...) by remuxing it with ffmpeg on the fly (video is copied, not re-encoded)
ffmpeg is optional: without it only files the browser can play by itself (mp4 / webm) work.
Run:  python StalkerTV.py        (options: --port N, --no-browser, --keep, --app)
"""
import os, sys, json, time, ssl, socket, shutil, subprocess, threading, webbrowser
import urllib.request, urllib.parse, urllib.error, zipfile, tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FROZEN = getattr(sys, 'frozen', False)          # True when packed as StalkerTV.exe (PyInstaller)
HERE = os.path.dirname(sys.executable) if FROZEN else os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(getattr(sys, '_MEIPASS', HERE), 'app') if FROZEN else os.path.join(HERE, 'app')
VERSION = '3.6.0-pc'
if sys.stdout is None or sys.stderr is None:    # windowless exe (no console): keep prints from crashing, log to a file instead
    try:
        _lf = open(os.path.join(HERE, 'StalkerTV.log'), 'w', encoding='utf-8', buffering=1)
    except Exception:
        _lf = open(os.devnull, 'w')
    if sys.stdout is None:
        sys.stdout = _lf
    if sys.stderr is None:
        sys.stderr = _lf

EXE = '.exe' if os.name == 'nt' else ''
NOWIN = {}
if os.name == 'nt':                       # never pop up a console window for ffmpeg / ffprobe
    NOWIN['creationflags'] = 0x08000000   # CREATE_NO_WINDOW
    try:
        _si = subprocess.STARTUPINFO(); _si.dwFlags |= 1; _si.wShowWindow = 0
        NOWIN['startupinfo'] = _si
    except Exception:
        pass
PORT = 8765
for i, a in enumerate(sys.argv):
    if a == '--port' and i + 1 < len(sys.argv):
        try:
            PORT = int(sys.argv[i + 1])
        except ValueError:
            pass
KEEP = '--keep' in sys.argv
NOBROWSER = '--no-browser' in sys.argv
TEST_WEBM = os.environ.get('PC_OUT') == 'webm'      # test switch: re-encode to webm so a codec-less Chromium can show it
FORCE_FF = os.environ.get('PC_FORCE_FF') == '1'      # test switch: never use the direct path
DEF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
LAST_PING = [0.0]
DL = {'st': ''}


def find_bin(name):
    for p in (os.path.join(HERE, 'ffmpeg', name + EXE), os.path.join(HERE, name + EXE), os.path.join(HERE, 'ffmpeg', 'bin', name + EXE)):
        if os.path.isfile(p):
            return p
    return shutil.which(name)


FFMPEG, FFPROBE = find_bin('ffmpeg'), find_bin('ffprobe')
CTX_OK = ssl.create_default_context()
CTX_BAD = ssl._create_unverified_context()
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png',
        '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.xml': 'application/xml'}


def log(*a):
    try:
        print(*a, flush=True)
    except Exception:
        pass


def open_upstream(url, headers, rng=None, timeout=30, data=None):
    h = {'User-Agent': DEF_UA, 'Accept': '*/*'}
    for k, v in (headers or {}).items():
        if k.lower() in ('host', 'connection', 'content-length', 'accept-encoding'):
            continue
        h[k] = v
    if rng:
        h['Range'] = rng
    req = urllib.request.Request(url, headers=h, data=data, method='POST' if data is not None else None)
    for ctx in (CTX_OK, CTX_BAD):
        try:
            return urllib.request.urlopen(req, timeout=timeout, context=ctx)
        except urllib.error.HTTPError as e:
            return e
        except ssl.SSLError:
            continue
        except urllib.error.URLError as e:
            if isinstance(getattr(e, 'reason', None), ssl.SSLError):
                continue
            raise
    raise ssl.SSLError('ssl')


def ff_input_args(url, headers):
    a = []
    if not re_http(url):
        return a
    hs = dict(headers or {})
    ua = None
    for k in list(hs):
        if k.lower() == 'user-agent':
            ua = hs.pop(k)
    a += ['-user_agent', ua or DEF_UA]
    if hs:
        a += ['-headers', ''.join('%s: %s\r\n' % (k, v) for k, v in hs.items())]
    return a


def re_http(u):
    return u.lower().startswith(('http://', 'https://'))


import tempfile, re
SUBDIR = tempfile.mkdtemp(prefix='stalkertv_')
PROBES = {}
PLOCK = threading.Lock()
TEXT_SUBS = ('subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text', 'microdvd', 'subviewer')
BROWSER_V = ('h264', 'vp8', 'vp9', 'av1')
BROWSER_A = ('aac', 'mp3', 'opus', 'vorbis', 'flac')


def probe(url, headers):
    with PLOCK:
        c = PROBES.get(url)
        if c and time.time() - c[0] < 300:
            return c[1]
    res = {'ok': False}
    if FFPROBE:
        cmd = [FFPROBE, '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-analyzeduration', '1500000', '-probesize', '2000000']
        if re_http(url):
            cmd += ['-rw_timeout', '15000000']
        cmd += ff_input_args(url, headers) + [url]
        try:
            out = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=25, **NOWIN).stdout
            j = json.loads(out.decode('utf-8', 'replace') or '{}')
            v, a, s = None, [], []
            for st in j.get('streams', []):
                t, tags = st.get('codec_type'), st.get('tags') or {}
                lang = tags.get('language', '') if tags.get('language') != 'und' else ''
                if t == 'video' and v is None and not (st.get('disposition') or {}).get('attached_pic'):
                    v = {'codec': st.get('codec_name', ''), 'w': st.get('width', 0), 'h': st.get('height', 0), 'pix': st.get('pix_fmt', ''), 'il': st.get('field_order', 'progressive') not in ('progressive', 'unknown', '')}
                elif t == 'audio':
                    a.append({'i': len(a), 'codec': st.get('codec_name', ''), 'ch': st.get('channels', 2), 'lang': lang, 'title': tags.get('title', '')})
                elif t == 'subtitle':
                    s.append({'i': len(s), 'codec': st.get('codec_name', ''), 'lang': lang, 'title': tags.get('title', ''), 'text': st.get('codec_name', '') in TEXT_SUBS})
            fm = j.get('format', {})
            try:
                dur = float(fm.get('duration') or 0)
            except ValueError:
                dur = 0
            fmt = fm.get('format_name', '')
            res = {'ok': bool(v or a), 'dur': dur, 'fmt': fmt, 'v': v or {}, 'a': a, 's': s}
            ok_c = ('mov' in fmt and 'mp4' in fmt) or fmt == 'webm' or fmt.endswith('webm')
            ok_v = v and v['codec'] in BROWSER_V and v['pix'] in ('yuv420p', 'yuvj420p', '') and not v['il']
            ok_a = (not a) or a[0]['codec'] in BROWSER_A
            res['direct'] = bool(ok_c and ok_v and ok_a and len(a) <= 1 and dur > 0 and not FORCE_FF and not any(x['text'] for x in s))
        except Exception as e:
            log('probe failed:', e)
    with PLOCK:
        PROBES[url] = (time.time(), res)
        if len(PROBES) > 80:
            PROBES.pop(next(iter(PROBES)))
    return res


SUBS = {}
LASTERR = ['']
ACTIVE = []
ALOCK = threading.Lock()
LASTPLAY = {'url': '', 'bytes': 0, 'started': 0, 'cmd': ''}


def find_vlc():
    """VLC: the copy shipped with the app (folder "vlc" next to it) first, then an installed one"""
    c = []
    if os.environ.get('VLC_PATH'):
        c.append(os.environ['VLC_PATH'])
    c.append(os.path.join(HERE, 'vlc', 'vlc' + EXE))
    if os.name == 'nt':
        for env in ('PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA', 'ProgramW6432'):
            b = os.environ.get(env)
            if b:
                c.append(os.path.join(b, 'VideoLAN', 'VLC', 'vlc.exe'))
        try:
            import winreg
            for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                for sub in (r'SOFTWARE\VideoLAN\VLC', r'SOFTWARE\WOW6432Node\VideoLAN\VLC'):
                    try:
                        with winreg.OpenKey(root, sub) as k:
                            c.append(os.path.join(winreg.QueryValueEx(k, 'InstallDir')[0], 'vlc.exe'))
                    except OSError:
                        pass
        except Exception:
            pass
    elif sys.platform == 'darwin':
        c.append('/Applications/VLC.app/Contents/MacOS/VLC')
    c.append(shutil.which('vlc') or '')
    for x in c:
        if x and os.path.isfile(x):
            return x
    return None


VLC = find_vlc()
VLCDIR = os.path.dirname(VLC) if VLC else ''
VLC_BUNDLED = bool(VLC) and os.path.normcase(os.path.abspath(VLCDIR)) == os.path.normcase(os.path.abspath(os.path.join(HERE, 'vlc')))
FAKE_EMB = os.environ.get('PC_FAKE_EMB') == '1'      # test switch: pretend the in-window VLC exists (no libvlc, no window)
MODE = {'cur': ''}                                   # '' / 'emb' (VLC inside the app window) / 'ext' (VLC's own window)
SUBSCALE = {'m': 100, 'l': 125, 'xl': 150}
import atexit
atexit.register(lambda: (vlc_stop(), emb_stop()))
VPROC = [None]
VINFO = {'port': 0, 'pw': 'stv', 'started': 0.0, 'fs': False}
VLOCK = threading.Lock()


def free_port():
    sk = socket.socket()
    sk.bind(('127.0.0.1', 0))
    pt = sk.getsockname()[1]
    sk.close()
    return pt


def stop_ffmpeg():
    with ALOCK:                                   # the ffmpeg stream must not keep a second connection to the provider
        old = list(ACTIVE)
        del ACTIVE[:]
    for o in old:
        try:
            o.kill()
        except Exception:
            pass


def vlc_target(url, headers):
    hs = dict(headers or {})
    ua = ref = None
    for k in list(hs):
        if k.lower() == 'user-agent':
            ua = hs.pop(k)
        elif k.lower() == 'referer':
            ref = hs.pop(k)
    target = url
    if hs and re_http(url):                       # VLC cannot send arbitrary headers: go through the local pass-through proxy
        target = 'http://127.0.0.1:%d/p?u=%s&h=%s' % (PORT, urllib.parse.quote(url, safe=''), urllib.parse.quote(json.dumps(hs), safe=''))
    return target, ua, ref


# ---------------------------------------------------------------- VLC in its own window (fallback) ----------
def vlc_stop():
    with VLOCK:
        p = VPROC[0]
        VPROC[0] = None
    if p is not None and p.poll() is None:
        try:
            p.kill()
            p.wait(3)
        except Exception:
            pass


def vlc_start(url, headers, ss, live, sz='m'):
    vlc_stop()
    emb_stop()
    stop_ffmpeg()
    target, ua, ref = vlc_target(url, headers)
    VINFO['port'] = free_port()
    VINFO['fs'] = False
    cmd = [VLC, '--no-one-instance', '--no-playlist-enqueue', '--fullscreen', '--play-and-exit', '--no-video-title-show',
           '--extraintf=http', '--http-host=127.0.0.1', '--http-port=%d' % VINFO['port'], '--http-password=' + VINFO['pw'],
           '--network-caching=%d' % (3000 if live else 1500), '--http-reconnect', '--sub-language=ara,eng',
           '--sub-text-scale=%d' % SUBSCALE.get(sz, 100)]
    if VLC_BUNDLED:
        cmd += ['--intf=dummy', '--dummy-quiet']   # the copy shipped with the app has no Qt interface: just the picture
    else:
        cmd += ['--no-qt-privacy-ask', '--no-qt-error-dialogs']
    if ua:
        cmd.append('--http-user-agent=' + ua)
    if ref:
        cmd.append('--http-referrer=' + ref)
    if ss and ss > 3:
        cmd.append('--start-time=%d' % int(ss))
    cmd.append(target)
    log('vlc (window):', mask(url))
    kw = {}
    if os.name == 'nt':
        kw['creationflags'] = 0x00000200          # CREATE_NEW_PROCESS_GROUP; VLC is a GUI app, its window must stay visible
    VPROC[0] = subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)
    VINFO['started'] = time.time()
    MODE['cur'] = 'ext'
    LASTPLAY.update(url=url, bytes=0)


def vlc_req(path, timeout=1.5):
    import base64
    rq = urllib.request.Request('http://127.0.0.1:%d/requests/%s' % (VINFO['port'], path), headers={'Authorization': 'Basic ' + base64.b64encode((':' + VINFO['pw']).encode()).decode()})
    with urllib.request.urlopen(rq, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8', 'replace') or '{}')


def vlc_status():
    p = VPROC[0]
    if p is None:
        return {'running': False, 'state': 'none', 'mode': 'ext'}
    if p.poll() is not None:
        return {'running': False, 'state': 'exited', 'code': p.returncode, 'mode': 'ext'}
    try:
        j = vlc_req('status.json')
        fs = j.get('fullscreen') in (True, 1, '1', 'true')
        if fs:
            VINFO['fs'] = True
        return {'running': True, 'mode': 'ext', 'state': j.get('state', 'unknown'), 'time': j.get('time', 0), 'length': j.get('length', 0),
                'fs': fs, 'wasfs': VINFO['fs']}
    except Exception:
        return {'running': True, 'mode': 'ext', 'state': 'starting', 'time': 0, 'length': 0}


def vlc_cmd(c, v=''):
    m = {'pause': 'pl_forcepause', 'play': 'pl_forceresume'}
    try:
        if c == 'seek':
            vlc_req('status.json?command=seek&val=%d' % int(float(v)))
        elif c in m:
            vlc_req('status.json?command=' + m[c])
        elif c == 'stop':
            vlc_stop()
        return True
    except Exception:
        return False


# ---------------------------------------------------------------- VLC inside the app window (libVLC) ----------
# The picture is drawn by libVLC into a black panel laid over the app's video area inside the same window.
# The page tells us where that area is (/vlc/rect); keys stay with the app, so every remote-style key works as before.
EMB = {'tried': False, 'ok': False, 'err': '', 'inst': None, 'mp': None, 'form': None, 'panel': None, 'wv': None,
       'b': (0, 0, 0, 0), 'vis': False, 'asp': 'fit', 'aspk': None, 'on': False, 'live': False, 'last': None}
ELOCK = threading.Lock()


def emb_form():
    w = _WINREF.get('w')
    if w is None:
        return None
    f = getattr(w, 'native', None)               # pywebview: the WinForms Form of the window
    if f is not None:
        return f
    try:
        from webview.platforms import winforms as wf
        inst = getattr(wf.BrowserView, 'instances', {}) or {}
        return inst.get(getattr(w, 'uid', None)) or (list(inst.values())[0] if inst else None)
    except Exception:
        return None


def emb_ui(fn):
    """runs fn on the window's GUI thread and returns its result"""
    form = EMB['form']
    res = {}

    def run():
        try:
            res['v'] = fn()
        except Exception as e:
            res['e'] = e
    if form is None:
        run()
    else:
        from System import Action
        if form.InvokeRequired:
            form.Invoke(Action(run))
        else:
            run()
    if 'e' in res:
        raise res['e']
    return res.get('v')


class _FakeMedia(object):
    def __init__(self, mrl):
        self.mrl, self.opts = mrl, []

    def add_option(self, o):
        self.opts.append(o)


class _FakeMP(object):
    """test double with the libVLC calls the app uses (PC_FAKE_EMB=1)"""
    def __init__(self):
        self.m, self.st, self.t0, self.base, self.paused, self.spu, self.au, self.delay = None, 'NothingSpecial', 0.0, 0, False, 2, 1, 0

    def set_media(self, m):
        self.m = m

    def play(self):
        self.st, self.t0, self.base, self.paused = 'Opening', time.time(), 0, False
        for o in self.m.opts:
            if o.startswith(':start-time='):
                self.base = int(o.split('=')[1]) * 1000

    def stop(self):
        self.st = 'Stopped'

    def get_state(self):
        if self.st == 'Opening' and time.time() - self.t0 > 0.6:
            self.st = 'Playing'
        return 'State.' + self.st

    def get_time(self):
        if self.st not in ('Playing', 'Paused'):
            return self.base
        return self.base + (0 if self.paused else int((time.time() - self.t0) * 1000))

    def get_length(self):
        return 0 if '/live/' in (self.m.mrl if self.m else '') else 3600000

    def set_pause(self, on):
        if on and not self.paused:
            self.base, self.paused, self.st = self.get_time(), True, 'Paused'
        elif not on and self.paused:
            self.t0, self.paused, self.st = time.time(), False, 'Playing'

    def set_time(self, ms):
        self.base, self.t0 = int(ms), time.time()

    def video_get_size(self, n=0):
        return (1920, 1080)

    def audio_get_track_description(self):
        return [(-1, b'Disable'), (1, b'Track 1 - [Arabic]'), (2, b'Track 2 - [English]')]

    def video_get_spu_description(self):
        return [(-1, b'Disable'), (2, b'Track 1 - [English]'), (3, b'Track 2 - [Arabic]')]

    def audio_get_track(self):
        return self.au

    def video_get_spu(self):
        return self.spu

    def audio_set_track(self, i):
        self.au = i

    def video_set_spu(self, i):
        self.spu = i

    def video_set_spu_delay(self, us):
        self.delay = us

    def video_set_aspect_ratio(self, a):
        EMB['fakeasp'] = ('aspect', a)

    def video_set_crop_geometry(self, a):
        EMB['fakecrop'] = ('crop', a)

    def video_set_marquee_int(self, o, v):
        EMB.setdefault('fakemarq', {})[o] = v

    def video_set_marquee_string(self, o, v):
        EMB.setdefault('fakemarq', {})['text'] = v


class _FakeInst(object):
    def media_new(self, mrl):
        return _FakeMedia(mrl)


def emb_init():
    with ELOCK:
        if EMB['tried']:
            return EMB['ok']
        EMB['tried'] = True
        try:
            if FAKE_EMB:
                EMB.update(inst=_FakeInst(), mp=_FakeMP(), ok=True)
                return True
            if os.name != 'nt':
                raise RuntimeError('only on Windows')
            if not VLCDIR or not os.path.isfile(os.path.join(VLCDIR, 'libvlc.dll')):
                raise RuntimeError('libvlc.dll not found')
            form = emb_form()
            if form is None:
                raise RuntimeError('no app window (running in a browser)')
            EMB['form'] = form
            os.environ['PYTHON_VLC_LIB_PATH'] = os.path.join(VLCDIR, 'libvlc.dll')
            os.environ['PYTHON_VLC_MODULE_PATH'] = os.path.join(VLCDIR, 'plugins')
            os.environ['VLC_PLUGIN_PATH'] = os.path.join(VLCDIR, 'plugins')
            try:
                os.add_dll_directory(VLCDIR)
            except Exception:
                pass
            try:
                import vlc as pyvlc
            except SystemExit:
                raise RuntimeError('python-vlc could not load libvlc.dll')
            inst = pyvlc.Instance(['--quiet', '--no-video-title-show', '--sub-language=ara,eng', '--http-reconnect',
                                   '--no-snapshot-preview', '--no-stats', '--no-osd'])
            if inst is None:
                raise RuntimeError('libvlc could not start')
            mp = inst.media_player_new()
            mp.video_set_key_input(False)            # keys and clicks stay with the app
            mp.video_set_mouse_input(False)
            import clr                               # pythonnet (pywebview's Windows backend)
            clr.AddReference('System.Windows.Forms')
            clr.AddReference('System.Drawing')
            from System.Windows.Forms import Panel
            from System.Drawing import Color

            def mk():
                pn = Panel()
                pn.BackColor = Color.Black
                pn.Visible = False
                pn.Enabled = False                   # never takes the keyboard or the mouse
                pn.SetBounds(0, 0, 16, 9)
                form.Controls.Add(pn)
                pn.BringToFront()
                EMB['panel'] = pn
                for ctl in form.Controls:
                    try:
                        if 'webview' in str(ctl.GetType().Name).lower():
                            EMB['wv'] = ctl
                    except Exception:
                        pass
                return int(pn.Handle.ToInt64())
            mp.set_hwnd(emb_ui(mk))
            EMB.update(inst=inst, mp=mp, ok=True)
            try:
                _WINREF['w'].events.closing += emb_shutdown
            except Exception:
                pass
            log('VLC inside the window: ready (%s)' % VLCDIR)
        except Exception as e:
            EMB['err'] = str(e)
            log('VLC inside the window not available: %s' % e)
        return EMB['ok']


def emb_shutdown():
    try:
        emb_stop()
    except Exception:
        pass


def emb_play(url, headers, ss, live, asp='fit', sz='m'):
    vlc_stop()
    stop_ffmpeg()
    target, ua, ref = vlc_target(url, headers)
    mp, inst = EMB['mp'], EMB['inst']
    m = inst.media_new(target)
    for o in (':network-caching=%d' % (3000 if live else 1500), ':http-reconnect', ':sub-text-scale=%d' % SUBSCALE.get(sz, 100)):
        m.add_option(o)
    if ua:
        m.add_option(':http-user-agent=' + ua)
    if ref:
        m.add_option(':http-referrer=' + ref)
    if ss and ss > 3:
        m.add_option(':start-time=%d' % int(ss))
    if EMB['on']:
        mp.stop()
    try:
        if EMB.get('marq'):
            emb_marq('')
    except Exception:
        pass
    mp.set_media(m)
    EMB.update(on=True, live=bool(live), asp=asp or 'fit', aspk=None, sz=sz or 'm')
    MODE['cur'] = 'emb'
    mp.play()
    log('vlc (in window):', mask(url))
    LASTPLAY.update(url=url, bytes=0)


def emb_stop():
    if not EMB.get('mp') or not EMB['on']:
        return
    EMB['on'] = False
    try:
        if EMB.get('marq'):
            emb_marq('')
    except Exception:
        pass
    try:
        EMB['mp'].stop()
    except Exception:
        pass
    try:
        emb_bounds(0, 0, 0, 0, False)
    except Exception:
        pass


def emb_status():
    mp = EMB['mp']
    if not mp or not EMB['on']:
        return {'running': False, 'state': 'none', 'mode': 'emb'}
    st = str(mp.get_state()).split('.')[-1].lower()
    st = {'nothingspecial': 'starting', 'opening': 'starting'}.get(st, st)
    vw = vh = 0
    try:
        vw, vh = mp.video_get_size(0)
    except Exception:
        pass
    return {'running': True, 'mode': 'emb', 'state': st, 'time': max(0, mp.get_time() or 0) / 1000.0,
            'length': max(0, mp.get_length() or 0) / 1000.0, 'vw': vw or 0, 'vh': vh or 0}


def emb_aspect(force=False):
    mp = EMB['mp']
    x, y, w, h = EMB['b']
    if not mp or w <= 0 or h <= 0:
        return
    a = EMB['asp']
    import math
    g = math.gcd(int(w), int(h)) or 1
    ratio = '%d:%d' % (int(w) // g, int(h) // g)
    key = (a, ratio if a != 'fit' else '')
    if key == EMB['aspk'] and not force:
        return
    EMB['aspk'] = key
    try:
        if a == 'fit':
            mp.video_set_crop_geometry(None)
            mp.video_set_aspect_ratio(None)
        elif a == 'zoom':                            # fill the area, cutting the edges
            mp.video_set_aspect_ratio(None)
            mp.video_set_crop_geometry(ratio)
        else:                                        # stretch / forced 16:9, 4:3, 21:9 (the area already has that shape)
            mp.video_set_crop_geometry(None)
            mp.video_set_aspect_ratio(ratio)
    except Exception as e:
        log('aspect:', e)


def emb_bounds(x, y, w, h, vis):
    EMB['last'] = {'x': x, 'y': y, 'w': w, 'h': h, 'v': bool(vis)}
    pn = EMB.get('panel')
    if pn is not None:
        def f():
            if vis:
                pn.SetBounds(int(x), int(y), max(2, int(w)), max(2, int(h)))
                if not pn.Visible:
                    pn.Visible = True
                pn.BringToFront()
            elif pn.Visible:
                pn.Visible = False
            wv, form = EMB.get('wv'), EMB.get('form')
            try:                                     # keys must keep going to the app
                if wv is not None and form.ContainsFocus and not wv.ContainsFocus:
                    wv.Focus()
            except Exception:
                pass
        emb_ui(f)
    EMB['b'] = (x, y, w, h)
    EMB['vis'] = bool(vis)
    if vis:
        emb_aspect()


def emb_tracks():
    mp = EMB['mp']
    if not mp or not EMB['on']:
        return {'a': [], 's': [], 'ca': -1, 'cs': -1}

    def norm(lst):
        out = []
        for t in (lst or []):
            try:
                n = t[1]
                if isinstance(n, bytes):
                    n = n.decode('utf-8', 'replace')
                out.append([int(t[0]), str(n)])
            except Exception:
                pass
        return out
    try:
        return {'a': norm(mp.audio_get_track_description()), 's': norm(mp.video_get_spu_description()),
                'ca': mp.audio_get_track(), 'cs': mp.video_get_spu()}
    except Exception:
        return {'a': [], 's': [], 'ca': -1, 'cs': -1}


def emb_cmd(c, v=''):
    mp = EMB['mp']
    if not mp:
        return False
    try:
        if c == 'pause':
            mp.set_pause(1)
        elif c == 'play':
            mp.set_pause(0)
        elif c == 'seek':
            mp.set_time(int(float(v) * 1000))
        elif c == 'stop':
            emb_stop()
        elif c == 'audio':
            mp.audio_set_track(int(v))
        elif c == 'spu':
            mp.video_set_spu(int(v))
        elif c == 'sdelay':                          # seconds, + = later
            mp.video_set_spu_delay(int(float(v) * 1000000))
        elif c == 'aspect':
            EMB['asp'] = v or 'fit'
            emb_aspect(True)
        elif c == 'marq':
            emb_marq(v)
        return True
    except Exception as e:
        log('vlc cmd %s failed: %s' % (c, e))
        return False


def emb_marq(text):
    """one subtitle line from the app (internet subtitles, already translated) drawn by VLC over the picture; '' hides it"""
    mp = EMB['mp']
    if not mp:
        return
    # libvlc_video_marquee_option_t: Enable 0, Text 1, Color 2, Opacity 3, Position 4, Refresh 5, Size 6, Timeout 7, X 8, Y 9
    if not text:
        mp.video_set_marquee_int(0, 0)
        EMB['marq'] = ''
        return
    try:
        w, h = mp.video_get_size(0) or (0, 0)
    except Exception:
        w, h = 0, 0
    size = {'m': 0.052, 'l': 0.062, 'xl': 0.074}.get(EMB.get('sz') or 'm', 0.052)
    mp.video_set_marquee_string(1, text)
    mp.video_set_marquee_int(2, 0xFFFFFF)
    mp.video_set_marquee_int(3, 255)
    mp.video_set_marquee_int(4, 8)                   # bottom centre
    mp.video_set_marquee_int(6, max(16, int((h or 720) * size)))
    mp.video_set_marquee_int(7, 0)
    mp.video_set_marquee_int(9, max(8, int((h or 720) * 0.06)))
    mp.video_set_marquee_int(0, 1)
    EMB['marq'] = text


SHIFT = {}


def kf_shift(pid):
    """the movie's own subtitles are written relative to the requested start, but the copied video starts at the keyframe
    before it and the mp4 output is shifted to start at 0 by that gap. The same ffmpeg run writes the first video/audio
    timestamps (unshifted) to <pid>.kf, which gives the gap exactly - also when the seek over HTTP lands somewhere else."""
    if pid in SHIFT:
        return SHIFT[pid]
    try:
        vals = []
        for ext in ('.kfv', '.kfa'):
            fn = os.path.join(SUBDIR, pid + ext)
            if ext == '.kfa' and not os.path.isfile(fn):
                continue
            tb, got = 0.0, None
            with open(fn, 'r', encoding='utf-8', errors='replace') as f:
                for ln in f:
                    ln = ln.strip()
                    m = re.match(r'#tb \d+: (\d+)/(\d+)', ln)
                    if m:
                        tb = float(m.group(1)) / float(m.group(2))
                    elif ln and not ln.startswith('#') and tb:
                        got = int(ln.split(',')[2]) * tb
                        break
            if got is None:
                return 0.0                # not written yet
            vals.append(got)
        mn = min(vals)
        SHIFT[pid] = -mn if abs(mn) < 60 else 0.0
        if len(SHIFT) > 20:
            SHIFT.pop(next(iter(SHIFT)))
        return SHIFT[pid]
    except Exception:
        return 0.0


def mask(u):
    import re
    return re.sub(r'(/(?:live|movie|series)/)[^/]+/[^/]+/', r'\1***/***/', re.sub(r'(password|pass|token)=[^&]+', r'\1=***', u))


def diag_text():
    out = ['Stalker TV PC ' + VERSION, 'python: ' + sys.version.split()[0], 'ffmpeg : ' + str(FFMPEG), 'ffprobe: ' + str(FFPROBE)]
    for b in (FFMPEG, FFPROBE):
        if b:
            try:
                out.append(subprocess.run([b, '-version'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=10, **NOWIN).stdout.decode('utf-8', 'replace').split('\n')[0])
            except Exception as e:
                out.append('cannot run %s: %s' % (b, e))
    out += ['', 'last play url : ' + mask(LASTPLAY['url']), 'bytes sent    : %d' % LASTPLAY['bytes'], 'ffmpeg error  : ' + (LASTERR[0] or '(none)')]
    return '\n'.join(out)


class H(BaseHTTPRequestHandler):
    server_version = 'StalkerTVPC/' + VERSION
    protocol_version = 'HTTP/1.0'

    def setup(self):
        BaseHTTPRequestHandler.setup(self)
        try:
            self.request.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass

    def log_message(self, *a):
        pass

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')

    def send_json(self, obj, code=200):
        b = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.cors()
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        try:
            u = urllib.parse.urlsplit(self.path)
            q = urllib.parse.parse_qs(u.query)
            p = u.path
            if p == '/__info':
                return self.send_json({'pc': True, 'ff': bool(FFMPEG and FFPROBE), 'ffmpeg': bool(FFMPEG), 'dl': DL['st'], 'vlc': bool(VLC) or FAKE_EMB, 'vlcBundled': VLC_BUNDLED, 'ver': VERSION, 'webm': TEST_WEBM})
            if p == '/__diag':
                b = diag_text().encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(b)))
                self.end_headers()
                self.wfile.write(b)
                return
            if p == '/__last':
                return self.send_json({'err': LASTERR[0]})
            if p == '/__ping':
                LAST_PING[0] = time.time()
                return self.send_json({'ok': 1})
            if p == '/p':
                return self.proxy(q)
            if p == '/probe':
                url = (q.get('u') or [''])[0]
                return self.send_json(probe(url, self.hdr(q)) if re_http(url) or os.path.isfile(url) else {'ok': False})
            if p == '/vlc/play':
                if not VLC and not FAKE_EMB:
                    return self.send_json({'ok': False, 'err': 'novlc'})
                try:
                    ss = float((q.get('ss') or ['0'])[0] or 0)
                except ValueError:
                    ss = 0
                url, hd, live = (q.get('u') or [''])[0], self.hdr(q), (q.get('live') or ['0'])[0] == '1'
                asp, sz = (q.get('asp') or ['fit'])[0], (q.get('sz') or ['m'])[0]
                if (q.get('win') or ['0'])[0] != '1' and emb_init():
                    try:
                        emb_play(url, hd, ss, live, asp, sz)
                        return self.send_json({'ok': True, 'mode': 'emb'})
                    except Exception as e:
                        log('VLC inside the window failed, using its own window: %s' % e)
                if not VLC:
                    return self.send_json({'ok': False, 'err': 'novlc'})
                vlc_start(url, hd, ss, live, sz)
                return self.send_json({'ok': True, 'mode': 'ext'})
            if p == '/vlc/status':
                return self.send_json(emb_status() if MODE['cur'] == 'emb' else vlc_status())
            if p == '/vlc/cmd':
                c, v = (q.get('c') or [''])[0], (q.get('v') or [''])[0]
                if c == 'stop':
                    emb_stop()
                    vlc_stop()
                    return self.send_json({'ok': True})
                return self.send_json({'ok': emb_cmd(c, v) if MODE['cur'] == 'emb' else vlc_cmd(c, v)})
            if p == '/vlc/rect':
                def num(k):
                    try:
                        return int(float((q.get(k) or ['0'])[0] or 0))
                    except ValueError:
                        return 0
                if MODE['cur'] == 'emb' or (q.get('v') or ['0'])[0] == '0':
                    try:
                        emb_bounds(num('x'), num('y'), num('w'), num('h'), (q.get('v') or ['0'])[0] == '1' and EMB['on'])
                    except Exception as e:
                        log('rect:', e)
                return self.send_json({'ok': True})
            if p == '/vlc/tracks':
                return self.send_json(emb_tracks() if MODE['cur'] == 'emb' else {'a': [], 's': [], 'ca': -1, 'cs': -1})
            if p == '/vlc/__test':
                return self.send_json({'last': EMB.get('last'), 'asp': EMB.get('fakeasp'), 'crop': EMB.get('fakecrop'), 'mode': MODE['cur'],
                                       'opts': EMB['mp'].m.opts if FAKE_EMB and EMB.get('mp') and EMB['mp'].m else None,
                                       'delay': getattr(EMB.get('mp'), 'delay', None), 'spu': getattr(EMB.get('mp'), 'spu', None), 'au': getattr(EMB.get('mp'), 'au', None),
                                       'marq': EMB.get('fakemarq')})
            if p == '/play':
                return self.play(q)
            if p == '/subfile':
                return self.subfile(q)
            if p == '/sub':
                return self.sub(q)
            return self.static(p)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except Exception as e:
            try:
                self.send_response(502)
                self.cors()
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8', 'replace'))
            except Exception:
                pass

    def hdr(self, q):
        try:
            h = json.loads((q.get('h') or ['{}'])[0] or '{}')
            return h if isinstance(h, dict) else {}
        except Exception:
            return {}

    def static(self, p):
        p = urllib.parse.unquote(p)
        if p in ('', '/'):
            p = '/index.html'
        f = os.path.normpath(os.path.join(APP, p.lstrip('/')))
        if not f.startswith(APP) or not os.path.isfile(f):
            self.send_response(404)
            self.end_headers()
            return
        with open(f, 'rb') as fh:
            b = fh.read()
        self.send_response(200)
        self.send_header('Content-Type', MIME.get(os.path.splitext(f)[1].lower(), 'application/octet-stream'))
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(b)

    def do_POST(self):
        """the app's POST requests (JSON to web services, e.g. the subtitle service) go out through the same proxy"""
        try:
            u = urllib.parse.urlsplit(self.path)
            q = urllib.parse.parse_qs(u.query)
            n = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(n) if n > 0 else b''
            if u.path == '/p':
                return self.proxy(q, body)
            self.send_response(404)
            self.cors()
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except Exception as e:
            try:
                self.send_response(502)
                self.cors()
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8', 'replace'))
            except Exception:
                pass

    def proxy(self, q, body=None):
        url = (q.get('u') or [''])[0]
        if not re_http(url):
            self.send_response(400)
            self.cors()
            self.end_headers()
            return
        try:
            r = open_upstream(url, self.hdr(q), self.headers.get('Range') if body is None else None, data=body)
        except Exception as e:
            self.send_response(502)
            self.cors()
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8', 'replace'))
            return
        code = getattr(r, 'status', None) or getattr(r, 'code', 502)
        gz = urllib.parse.urlsplit(url).path.lower().endswith('.gz') and code == 200 and not self.headers.get('Range')   # guide files (.xml.gz) are unpacked here
        self.send_response(code)
        for k in ('Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'):
            v = r.headers.get(k)
            if v and not (gz and k in ('Content-Length', 'Content-Type')):
                self.send_header(k, v)
        if gz:
            self.send_header('Content-Type', 'text/xml; charset=utf-8')
        self.cors()
        self.end_headers()
        if self.command == 'HEAD':
            return
        try:
            if gz:
                import zlib
                d = zlib.decompressobj(47)
                while True:
                    c = r.read(65536)
                    if not c:
                        break
                    o = d.decompress(c)
                    if o:
                        self.wfile.write(o)
                self.wfile.write(d.flush())
                return
            while True:
                b = r.read(65536)
                if not b:
                    break
                self.wfile.write(b)
        finally:
            try:
                r.close()
            except Exception:
                pass

    def watch(self, proc):
        """kill ffmpeg as soon as the browser closes the connection"""
        def run():
            try:
                self.connection.settimeout(None)
                while proc.poll() is None:
                    if self.connection.recv(1, socket.MSG_PEEK) == b'':
                        break
                    time.sleep(0.5)
            except Exception:
                pass
            try:
                proc.kill()
            except Exception:
                pass
        threading.Thread(target=run, daemon=True).start()

    def play(self, q):
        url = (q.get('u') or [''])[0]
        hd = self.hdr(q)
        if not FFMPEG:
            return self.proxy(q)
        ss = float((q.get('ss') or ['0'])[0] or 0)
        ai = int((q.get('a') or ['0'])[0] or 0)
        live = (q.get('np') or ['0'])[0] == '1'
        pid = re.sub(r'[^0-9a-z]', '', (q.get('pid') or [''])[0])[:24]
        try:
            si = int((q.get('si') or ['-1'])[0] or -1)
        except ValueError:
            si = -1
        info = probe(url, hd) if (q.get('np') or ['0'])[0] != '1' else {}
        v, a = info.get('v') or {}, info.get('a') or []
        cmd = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-nostdin']
        if re_http(url):
            cmd += ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '4']
        if live:
            cmd += ['-fflags', '+genpts+discardcorrupt+nobuffer', '-probesize', '1000000', '-analyzeduration', '800000']
        else:
            cmd += ['-fflags', '+genpts+discardcorrupt', '-probesize', '3000000', '-analyzeduration', '3000000']
        if ss > 0.5:
            cmd += ['-ss', '%.3f' % ss]
        cmd += ff_input_args(url, hd) + ['-i', url, '-map', '0:v:0?', '-map', '0:a:%d?' % ai, '-sn', '-dn', '-avoid_negative_ts', 'make_zero']
        if TEST_WEBM:
            cmd += ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '1M', '-vf', 'scale=640:-2', '-c:a', 'libvorbis', '-ac', '2', '-f', 'webm', '-']
            ctype = 'video/webm'
        else:
            vc = v.get('codec', 'h264')
            if vc in ('h264', 'hevc', 'vp9', 'av1') and v.get('pix', 'yuv420p') in ('yuv420p', 'yuvj420p', 'yuv420p10le', '') and not v.get('il'):
                cmd += ['-c:v', 'copy'] + (['-tag:v', 'hvc1'] if vc == 'hevc' else [])
            else:
                cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'yadif']
            ac = a[ai] if ai < len(a) else None
            if ac and ac['codec'] == 'aac' and ac.get('ch', 2) <= 2:
                cmd += ['-c:a', 'copy']
            else:
                cmd += ['-c:a', 'aac', '-b:a', '192k', '-ac', '2']
            cmd += ['-flush_packets', '1', '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-']
            ctype = 'video/mp4'
            # the movie's own subtitle, written by the same ffmpeg while it plays (no second connection to the provider)
            subs = info.get('s') or []
            ts = [x for x in subs if x.get('text')]
            if pid and not live and ts:
                if si < 0 or si >= len(subs) or not subs[si].get('text'):
                    si = (ts[0]['i'] if not [x for x in ts if (x.get('lang') or '').lower().startswith('en')] else [x for x in ts if (x.get('lang') or '').lower().startswith('en')][0]['i'])
                cmd += ['-map', '0:s:%d' % si, '-c:s', 'webvtt', '-flush_packets', '1', '-f', 'webvtt', os.path.join(SUBDIR, pid + '.vtt')]
                SHIFT.pop(pid, None)
                if ss > 0.5 and cmd[cmd.index('-c:v') + 1] == 'copy':    # copied video starts at the keyframe before ss: record where exactly
                    cmd += ['-map', '0:v:0', '-c', 'copy', '-frames:v', '1', '-avoid_negative_ts', 'disabled', '-f', 'framemd5', os.path.join(SUBDIR, pid + '.kfv')]
                    if a:
                        cmd += ['-map', '0:a:%d?' % ai, '-c', 'copy', '-frames:a', '1', '-avoid_negative_ts', 'disabled', '-f', 'framemd5', os.path.join(SUBDIR, pid + '.kfa')]
        # one stream at a time: stop the previous one first and wait until its connection to the provider is really closed
        # (many providers allow a single connection, so a new request while the old one lingers is refused)
        with ALOCK:
            old = list(ACTIVE)
            del ACTIVE[:]
        for o in old:
            try:
                o.kill()
                o.wait(2)
            except Exception:
                pass
        if old:
            time.sleep(0.12)
        if pid:
            for f in os.listdir(SUBDIR):
                if not f.startswith(pid + '.'):
                    try:
                        os.remove(os.path.join(SUBDIR, f))
                    except Exception:
                        pass
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, bufsize=0, **NOWIN)
        with ALOCK:
            ACTIVE.append(proc)
        self.watch(proc)
        LASTERR[0] = ''
        LASTPLAY.update(url=url, bytes=0)

        def errs():
            for l in proc.stderr:
                l = l.decode('utf-8', 'replace').strip()
                if l:
                    log('ffmpeg:', l)
                    LASTERR[0] = (LASTERR[0] + ' | ' + l)[-400:]
        threading.Thread(target=errs, daemon=True).start()
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        self.cors()
        self.end_headers()
        try:
            while True:
                b = proc.stdout.read(65536)
                if not b:
                    break
                self.wfile.write(b)
                LASTPLAY['bytes'] += len(b)
        finally:
            try:
                proc.kill()
            except Exception:
                pass
            with ALOCK:
                if proc in ACTIVE:
                    ACTIVE.remove(proc)

    def subfile(self, q):
        pid = re.sub(r'[^0-9a-z]', '', (q.get('pid') or [''])[0])[:24]
        try:
            pos = int((q.get('from') or ['0'])[0] or 0)
        except ValueError:
            pos = 0
        b = b''
        try:
            with open(os.path.join(SUBDIR, pid + '.vtt'), 'rb') as f:
                f.seek(pos)
                b = f.read(1 << 20)
        except Exception:
            pass
        self.send_response(200)
        self.send_header('Content-Type', 'text/vtt; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Shift', '%.3f' % kf_shift(pid))
        self.send_header('Access-Control-Expose-Headers', 'X-Shift')
        self.cors()
        self.end_headers()
        self.wfile.write(b)

    def sub(self, q):
        url = (q.get('u') or [''])[0]
        i = int((q.get('i') or ['0'])[0] or 0)
        key = (url, i)
        b = SUBS.get(key)
        if b is None:
            if not FFMPEG:
                self.send_response(404)
                self.end_headers()
                return
            cmd = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-nostdin'] + ff_input_args(url, self.hdr(q)) + ['-i', url, '-map', '0:s:%d' % i, '-f', 'webvtt', '-']
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, **NOWIN)
            self.watch(proc)
            b = proc.stdout.read()
            proc.wait()
            if len(SUBS) > 6:
                SUBS.pop(next(iter(SUBS)))
            if b:
                SUBS[key] = b
        self.send_response(200)
        self.send_header('Content-Type', 'text/vtt; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.cors()
        self.end_headers()
        self.wfile.write(b)


def browser_cmd(url):
    if '--app' not in sys.argv:        # default: your normal browser tab (accounts and settings live in that browser)
        return None
    cands = []
    if os.name == 'nt':
        for env in ('PROGRAMFILES(X86)', 'PROGRAMFILES', 'LOCALAPPDATA'):
            b = os.environ.get(env)
            if b:
                cands += [os.path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), os.path.join(b, 'Google', 'Chrome', 'Application', 'chrome.exe')]
    elif sys.platform == 'darwin':
        cands += ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    else:
        cands += [shutil.which(x) or '' for x in ('google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge')]
    for c in cands:
        if c and os.path.isfile(c):
            prof = os.path.join(HERE, 'profile')
            return [c, '--app=' + url, '--window-size=1280,720', '--user-data-dir=' + prof, '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check']
    return None


FF_URLS = [os.environ.get('FFMPEG_URL')] if os.environ.get('FFMPEG_URL') else [
    'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip']


def download_ffmpeg():
    """downloads a Windows ffmpeg build and puts ffmpeg.exe / ffprobe.exe into the ffmpeg folder"""
    global FFMPEG, FFPROBE
    dest = os.path.join(HERE, 'ffmpeg')
    os.makedirs(dest, exist_ok=True)
    for url in FF_URLS:
        tmp = None
        try:
            log('  downloading ' + url)
            req = urllib.request.Request(url, headers={'User-Agent': DEF_UA})
            fd, tmp = tempfile.mkstemp(suffix='.zip')
            done, last = 0, 0
            with os.fdopen(fd, 'wb') as out, urllib.request.urlopen(req, timeout=60) as r:
                total = int(r.headers.get('Content-Length') or 0)
                while True:
                    b = r.read(262144)
                    if not b:
                        break
                    out.write(b)
                    done += len(b)
                    if time.time() - last > 1:
                        last = time.time()
                        log('    %d MB%s' % (done >> 20, (' / %d MB' % (total >> 20)) if total else ''))
            got = 0
            with zipfile.ZipFile(tmp) as z:
                for n in z.namelist():
                    base = os.path.basename(n).lower()
                    if base in ('ffmpeg' + EXE, 'ffprobe' + EXE):
                        with z.open(n) as src, open(os.path.join(dest, base), 'wb') as dst:
                            shutil.copyfileobj(src, dst)
                        got += 1
            if got >= 2:
                FFMPEG, FFPROBE = find_bin('ffmpeg'), find_bin('ffprobe')
                log('  ffmpeg installed')
                return True
            log('  the archive did not contain ffmpeg and ffprobe')
        except Exception as e:
            log('  failed: %s' % e)
        finally:
            if tmp:
                try:
                    os.remove(tmp)
                except Exception:
                    pass
    return False


def bg_download():
    if os.name != 'nt' or (FFMPEG and FFPROBE) or DL['st'] == 'downloading':
        return
    def run():
        DL['st'] = 'downloading'
        DL['st'] = 'done' if download_ffmpeg() else 'fail'
    threading.Thread(target=run, daemon=True).start()


_WINREF = {}


def run_window(url):
    """opens the app in its own native window (pywebview, uses Edge WebView2 on Windows); returns False if that is not possible"""
    if '--browser' in sys.argv:
        return False
    try:
        import webview
    except Exception:
        return False
    os.environ.setdefault('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', '--autoplay-policy=no-user-gesture-required')
    os.environ.setdefault('PYWEBVIEW_GUI', 'edgechromium')      # the WinForms window: VLC draws into a panel inside it
    try:
        class _Api(object):
            # NOTE: no attribute here may hold the window object: pywebview walks the attributes of the js_api
            # object, and a Window reference makes it recurse through the whole GUI object (app freezes / "Not responding").
            def toggle_fullscreen(self):
                try:
                    _WINREF['w'].toggle_fullscreen()
                except Exception:
                    pass
        _api = _Api()
        log('opening native window...')
        _WINREF['w'] = webview.create_window('Stalker TV', url, width=1280, height=720, min_size=(960, 540), background_color='#090b10', js_api=_api, fullscreen='--fullscreen' in sys.argv)
        log('window created, starting GUI loop')
        try:
            webview.start(storage_path=os.path.join(HERE, 'profile'), private_mode=False)
        except TypeError:
            webview.start()
        return True
    except Exception as e:
        log('native window failed: %s' % e)
        return False


def ensure_ffmpeg():
    if (FFMPEG and FFPROBE) or '--no-ffmpeg-prompt' in sys.argv:
        return
    auto = '--get-ffmpeg' in sys.argv
    if not auto:
        if not sys.stdin or not sys.stdin.isatty():
            return
        log('')
        log('ffmpeg was not found. Live TV and most movie formats need it.')
        if os.name != 'nt':
            log('Install it with your package manager (apt install ffmpeg / brew install ffmpeg), then start again.')
            return
        try:
            ans = input('Download it now (about 30-80 MB, one time)? [Y/n] ').strip().lower()
        except Exception:
            return
        if ans.startswith('n'):
            return
    if not download_ffmpeg():
        log('  could not download. Put ffmpeg.exe and ffprobe.exe in the "ffmpeg" folder by hand (see README.txt).')


def selftest_vlc(media, outpath):
    """CI check on Windows: libVLC from the shipped folder, drawing into a WinForms panel, and every call the app makes"""
    out = []

    def say(*a):
        out.append(' '.join(str(x) for x in a))
    try:
        say('VLC:', VLC, 'bundled:', VLC_BUNDLED, 'frozen:', FROZEN)
        os.environ['PYTHON_VLC_LIB_PATH'] = os.path.join(VLCDIR, 'libvlc.dll')
        os.environ['PYTHON_VLC_MODULE_PATH'] = os.path.join(VLCDIR, 'plugins')
        os.environ['VLC_PLUGIN_PATH'] = os.path.join(VLCDIR, 'plugins')
        try:
            os.add_dll_directory(VLCDIR)
        except Exception:
            pass
        import vlc as pyvlc
        say('python-vlc', getattr(pyvlc, '__version__', '?'), 'libvlc', pyvlc.libvlc_get_version())
        inst = pyvlc.Instance(['--quiet', '--no-video-title-show', '--sub-language=ara,eng', '--http-reconnect', '--no-snapshot-preview', '--no-stats', '--no-osd'])
        mp = inst.media_player_new()
        mp.video_set_key_input(False)
        mp.video_set_mouse_input(False)
        import clr
        clr.AddReference('System.Windows.Forms')
        clr.AddReference('System.Drawing')
        from System.Windows.Forms import Form, Panel, Application
        from System.Drawing import Color
        f = Form()
        f.Width, f.Height = 900, 520
        pn = Panel()
        pn.BackColor = Color.Black
        pn.Enabled = False
        pn.SetBounds(0, 0, 640, 360)
        f.Controls.Add(pn)
        pn.BringToFront()
        f.Show()
        mp.set_hwnd(int(pn.Handle.ToInt64()))

        def pump(sec):
            t0 = time.time()
            while time.time() - t0 < sec:
                Application.DoEvents()
                time.sleep(0.03)
        m = inst.media_new(media)
        for o in (':network-caching=1500', ':http-reconnect', ':sub-text-scale=125', ':start-time=3'):
            m.add_option(o)
        mp.set_media(m)
        mp.play()
        pump(5)
        try:
            size = mp.video_get_size(0)
        except Exception as e:
            size = 'err %s' % e
        say('state', mp.get_state(), 'time', mp.get_time(), 'length', mp.get_length(), 'size', size)
        EMB.update(mp=mp, on=True)
        say('tracks', json.dumps(emb_tracks(), ensure_ascii=False))
        mp.set_time(12000)
        pump(1.5)
        say('after seek to 12s:', mp.get_time())
        mp.set_pause(1)
        pump(1)
        say('after pause:', mp.get_state())
        mp.set_pause(0)
        mp.audio_set_track(emb_tracks()['a'][-1][0])
        mp.video_set_spu(emb_tracks()['s'][-1][0])
        mp.video_set_spu_delay(500000)
        pump(1)
        say('audio now', mp.audio_get_track(), 'spu now', mp.video_get_spu(), 'spu delay', mp.video_get_spu_delay())
        pn.SetBounds(100, 50, 480, 270)
        EMB.update(b=(100, 50, 480, 270), asp='zoom', aspk=None)
        emb_aspect(True)
        EMB.update(asp='fill', aspk=None)
        emb_aspect(True)
        EMB.update(asp='fit', aspk=None)
        emb_aspect(True)
        pump(1.5)
        say('after resize/aspect:', mp.get_state(), mp.get_time())
        mp.stop()
        say('after stop:', mp.get_state())
        f.Close()
        say('SELFTEST OK')
    except BaseException:
        import traceback
        say('SELFTEST FAIL', traceback.format_exc())
    try:
        import webview
        from webview.platforms import winforms as wf
        say('pywebview', getattr(webview, '__version__', '?'), 'BrowserView.instances:', hasattr(wf.BrowserView, 'instances'))
    except BaseException as e:
        say('pywebview check:', repr(e))
    with open(outpath, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out) + '\n')


def main():
    if not os.path.isdir(APP):
        log('app folder not found next to StalkerTV.py')
        return 1
    WINDOWED = False
    try:
        import webview  # noqa
        WINDOWED = '--browser' not in sys.argv and '--no-window' not in sys.argv
    except Exception:
        pass
    if WINDOWED or not (sys.stdin and sys.stdin.isatty()):      # window / no console: download ffmpeg quietly in the background
        bg_download()
    else:
        ensure_ffmpeg()
    url = 'http://127.0.0.1:%d/' % PORT
    try:
        srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    except OSError:
        try:
            urllib.request.urlopen(url + '__info', timeout=2).read()
            log('Stalker TV is already running - opening it.')
            if not NOBROWSER:
                cmd = browser_cmd(url)
                subprocess.Popen(cmd) if cmd else webbrowser.open(url)
            return 0
        except Exception:
            log('Port %d is busy. Use:  python StalkerTV.py --port 8766' % PORT)
            return 1
    srv.daemon_threads = True
    log('Stalker TV %s' % VERSION)
    log('  address : ' + url)
    log('  vlc     : ' + (VLC or 'not found') + (' (shipped with the app)' if VLC_BUNDLED else ''))
    log('  ffmpeg  : ' + (FFMPEG or 'NOT FOUND (only mp4/webm files will play - put ffmpeg.exe and ffprobe.exe in the "ffmpeg" folder)'))
    if FFMPEG and not FFPROBE:
        log('  ffprobe : NOT FOUND (needed together with ffmpeg)')
    log('  close the window (or press Ctrl+C) to quit')
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    if WINDOWED and not NOBROWSER:
        if run_window(url):
            log('window closed - bye')
            return 0
    if not NOBROWSER:
        cmd = browser_cmd(url)
        try:
            subprocess.Popen(cmd) if cmd else webbrowser.open(url)
        except Exception:
            webbrowser.open(url)
    t0 = time.time()
    try:
        while True:
            time.sleep(2)
            if not KEEP and LAST_PING[0] and time.time() - LAST_PING[0] > 150:
                log('window closed - bye')
                break
            if not KEEP and not LAST_PING[0] and time.time() - t0 > 300:
                log('no window connected - bye')
                break
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    try:
        if sys.version_info < (3, 7):
            print('Python 3.7 or newer is required. You have ' + sys.version.split()[0])
            rc = 1
        elif '--selftest-vlc' in sys.argv:
            i = sys.argv.index('--selftest-vlc')
            selftest_vlc(sys.argv[i + 1], sys.argv[i + 2])
            rc = 0
        else:
            rc = main()
    except KeyboardInterrupt:
        rc = 0
    except BaseException:
        import traceback
        text = traceback.format_exc()
        print('\n*** Stalker TV stopped because of an error ***\n' + text)
        try:
            with open(os.path.join(HERE, 'error.log'), 'w', encoding='utf-8') as f:
                f.write(text)
        except Exception:
            pass
        rc = 1
    if rc:
        if not sys.stdin or not sys.stdin.isatty():       # no console: show the error in a message box instead of a black window
            try:
                if os.name == 'nt':
                    import ctypes
                    ctypes.windll.user32.MessageBoxW(0, (locals().get('text') or 'Stalker TV stopped.')[-900:] + '\n\nDetails: error.log / StalkerTV.log next to the exe', 'Stalker TV', 0x10)
            except Exception:
                pass
        else:
            try:
                input('\nPress Enter to close...')
            except Exception:
                time.sleep(30)
    sys.exit(rc)
