"""Build Play 2050 (formerly Contact 2050), the Makey Makey soundboard: inject kits.json and dirt-samples.json into template.html.

  python3 -I build.py             writes dist/contact2050.html (streams sounds from the Dirt-Samples CDN)
  python3 -I build.py --offline   also writes dist/contact2050-offline.html with every kit sound and a
                                  CHAOS pool built in, for venues without wifi (needs ffmpeg; not committed)
"""
import base64, hashlib, json, os, re, shutil, subprocess, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
SYNTHS = {'airhorn', 'riser', 'siren', 'teleport', 'laser', 'drop'}
MODES = {'shot', 'hold', 'loop'}
TUNES = {'auto', 'off', 'root', 'tonic', 'melody', 'arp', 'chord', 'strum', 'contour'}  # what auto-tune does with a pad in jam mode
SCALES = {'major', 'minor', 'dorian', 'mixolydian'}
CHORD = re.compile(r'[A-G][#b]?(m(?!aj))?(maj7|7|sus2|sus4|add9)?')
STEPS = re.compile(r'[xo.]{16}')  # one bar of sixteenths: x = hit, o = soft hit
OFFLINE_LIMIT = 15_000_000  # Artifact pages must stay under 16 MB
HOME = 'href="../../index.html"'  # the party's front page: the repo and the website keep the same paths
SITE = 'https://future-party-2050.vercel.app/'


def load(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as fh:
        return json.load(fh)


kits, lib = load('kits.json'), load('dirt-samples.json')
tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
KEYS = ('__KITS_JSON__', '__LIBRARY_JSON__', '__AUDIO_JSON__', '__BUILD_JSON__')
for key in KEYS + (HOME,):
    assert tpl.count(key) == 1, key
files = {f'{folder}/{name}' for folder, items in lib['folders'].items() for name, _, _ in items}

# Integrity checks, and expand "dir" pads into their sample lists
ids = [i['id'] for i in kits['inputs']]
assert len(set(ids)) == len(ids) == 12, 'twelve unique Makey Makey inputs'
assert len({i['code'] for i in kits['inputs']}) == 12, 'duplicate default key'
assert kits['phrases'], 'announcer phrases'
assert len({k['id'] for k in kits['kits']}) == len(kits['kits']) <= 9, 'kit ids unique, at most 9 (keys 1-9)'
for name, groove in kits['grooves'].items():
    for part, path in groove['drums'].items():
        assert path in files, (name, part, path)
        assert STEPS.fullmatch(groove['pattern'][part]), (name, part)
    for layer in ('bass', 'arp'):
        if groove.get(layer):
            assert STEPS.fullmatch(groove[layer]['pattern']), (name, layer)
    assert 0 <= groove.get('swing', 0) <= 0.33, (name, 'swing is a fraction of a sixteenth, 0 to 1/3')
    assert groove.get('crash', 'none') == 'none' or groove['crash'] in files, (name, 'crash')
for kit in kits['kits']:
    assert re.fullmatch(r'#[0-9a-f]{6}', kit['color']), kit['id']
    jam = kit['jam']
    assert jam['groove'] in kits['grooves'] and jam['scale'] in SCALES and 60 <= jam['bpm'] <= 180, kit['id']
    assert re.fullmatch(r'[A-G][#b]?', jam['key']) and jam['chords'], kit['id']
    for c in jam['chords']:
        assert CHORD.fullmatch(c), (kit['id'], c)
    assert set(kit['pads']) == set(ids), (kit['id'], set(ids) ^ set(kit['pads']))
    for pid, pad in kit['pads'].items():
        where = f"{kit['id']}.{pid}"
        kinds = [k for k in ('src', 'dir', 'synth', 'speak', 'chaos') if k in pad]
        assert len(kinds) == 1, (where, kinds)
        assert pad.get('name') and len(pad['name']) <= 18, where
        assert pad.get('mode', 'shot') in MODES, where
        assert pad.get('pick', 'random') in ('random', 'cycle'), where
        assert pad.get('tune', 'auto') in TUNES, where
        if 'beats' in pad:
            assert pad.get('mode') in ('hold', 'loop') and pad['beats'] > 0, where
        if 'dir' in pad:
            assert pad['dir'] in lib['folders'], (where, pad['dir'])
            names = [n for n, _, _ in lib['folders'][pad['dir']]]
            for s in pad.get('skip', []):
                assert s in names, (where, s)
            pad['src'] = [f"{pad['dir']}/{n}" for n in names if n not in pad.get('skip', [])]
            pad.pop('skip', None)
        if 'src' in pad:
            assert pad['src'], where
            for p in pad['src']:
                assert p in files, (where, p)
        if 'synth' in pad:
            assert pad['synth'] in SYNTHS, where
        if 'burst' in pad:
            n, gap = pad['burst']
            assert 1 < n <= 16 and 0 < gap < 1, where

js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
kit_paths = sorted({p for kit in kits['kits'] for pad in kit['pads'].values() for p in pad.get('src', [])}
                   | {p for groove in kits['grooves'].values() for p in [*groove['drums'].values(), groove.get('crash')] if p})


def page(audio, build, bare=False):
    html = (tpl.replace('__KITS_JSON__', js(kits)).replace('__LIBRARY_JSON__', js(lib))
               .replace('__AUDIO_JSON__', js(audio)).replace('__BUILD_JSON__', js(build)))
    if bare:  # the Artifact host adds its own document skeleton; off the site, the front page needs its full address
        return html.replace(HOME, f'href="{SITE}"')
    if audio:  # the offline copy makes no requests at all: it falls back from Inter to the system font
        html = re.sub(r'<link [^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n', '', html)
    return ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + html)


def write(name, html):
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    with open(os.path.join(HERE, 'dist', name), 'w', encoding='utf-8') as fh:
        fh.write(html)
    return len(html.encode())


today = date.today().isoformat()
size = write('contact2050.html', page(None, {'mode': 'online', 'built': today}))
pads = sum(len(k['pads']) for k in kits['kits'])
print(f"built dist/contact2050.html ({size:,} bytes); {len(kits['kits'])} kits, {pads} pads, "
      f"{len(kit_paths)} kit samples, library of {len(files)} sounds in {len(lib['folders'])} folders")

if '--offline' not in sys.argv[1:]:
    sys.exit(0)

# ---- Offline build: download, transcode and embed ----
assert shutil.which('ffmpeg'), 'the offline build needs ffmpeg (brew install ffmpeg)'
by_path = {f'{folder}/{n}': (ms, db) for folder, items in lib['folders'].items() for n, ms, db in items}


def chaos_pool():
    """Up to two lively, short sounds per folder, picked by a stable hash so rebuilds embed the same set."""
    pool = []
    for folder, items in sorted(lib['folders'].items()):
        ok = [f'{folder}/{n}' for n, ms, db in items if 150 <= ms <= 2500 and db > -30]
        ok.sort(key=lambda p: hashlib.sha1(p.encode()).hexdigest())
        pool += [p for p in ok[:2] if p not in kit_paths]
    return pool


bases = [f"https://cdn.jsdelivr.net/gh/{lib['repo']}@{lib['sha']}/",
         f"https://raw.githubusercontent.com/{lib['repo']}/{lib['sha']}/"]


def fetch(path):
    dst = os.path.join(CACHE, 'raw', lib['sha'][:12], *path.split('/'))
    if os.path.exists(dst):
        return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    quoted = '/'.join(urllib.parse.quote(part) for part in path.split('/'))
    err = None
    for base in bases:
        try:
            with urllib.request.urlopen(base + quoted, timeout=60) as r:
                data = r.read()
            with open(dst + '.part', 'wb') as fh:
                fh.write(data)
            os.replace(dst + '.part', dst)
            return dst
        except Exception as e:  # try the next mirror
            err = e
    raise RuntimeError(f'could not download {path}: {err}')


def encode(path, kbps, mono):
    src = fetch(path)
    tag = hashlib.sha1(f'{path}|{kbps}|{mono}'.encode()).hexdigest()[:16]
    dst = os.path.join(CACHE, 'mp3', tag + '.mp3')
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-map_metadata', '-1']
        cmd += ['-ac', '1'] if mono else ['-ac', '2']
        cmd += ['-ar', '44100', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', dst + '.part.mp3']
        subprocess.run(cmd, check=True)
        os.replace(dst + '.part.mp3', dst)
    with open(dst, 'rb') as fh:
        return path, 'data:audio/mpeg;base64,' + base64.b64encode(fh.read()).decode()


def channels(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels',
                          '-of', 'csv=p=0', fetch(path)], capture_output=True, text=True).stdout.strip()
    return int(out or 1)


pool = chaos_pool()
with ThreadPoolExecutor(8) as ex:
    list(ex.map(fetch, kit_paths + pool))
    jobs = [(p, 128, channels(p) == 1) for p in kit_paths] + [(p, 80, True) for p in pool]
    audio = dict(ex.map(lambda j: encode(*j), jobs))

build = {'mode': 'offline', 'built': today, 'bundled': len(audio)}
size = write('contact2050-offline.html', page(audio, build))
os.makedirs(CACHE, exist_ok=True)
with open(os.path.join(CACHE, 'contact2050-artifact.html'), 'w', encoding='utf-8') as fh:
    fh.write(page(audio, build, bare=True))
print(f"built dist/contact2050-offline.html ({size:,} bytes); {len(kit_paths)} kit samples + "
      f"{len(pool)} CHAOS sounds built in, {sum(by_path[p][0] for p in audio) / 1000:.0f} s of audio")
assert size < OFFLINE_LIMIT, f'offline page is {size:,} bytes; trim the CHAOS pool'
