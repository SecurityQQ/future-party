"""Write dirt-samples.json: every audio file in tidalcycles/Dirt-Samples with its length and loudness.
The app uses it for the sound browser and the CHAOS pad. Needs ffmpeg/ffprobe.

Run: python3 -I tools/manifest.py <path to a Dirt-Samples checkout> <commit sha>
     (git clone https://github.com/tidalcycles/Dirt-Samples && git -C Dirt-Samples rev-parse HEAD)"""
import concurrent.futures as cf, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = ('.wav', '.ogg', '.mp3', '.flac', '.aif', '.aiff')
root, sha = sys.argv[1], sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{40}', sha), 'pass the full 40-character commit sha'

def measure(rel):
    full = os.path.join(root, rel)
    run = lambda *a: subprocess.run(a, capture_output=True, text=True, errors='replace', timeout=120)
    probe = json.loads(run('ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', full).stdout or '{}')
    stats = run('ffmpeg', '-hide_banner', '-nostats', '-i', full, '-af',
                'astats=measure_overall=RMS_level:measure_perchannel=none', '-f', 'null', '-').stderr
    rms = re.findall(r'RMS level dB:\s*(-?[\d.]+|-inf)', stats)
    stream = (probe.get('streams') or [{}])[0]
    return rel, {
        'ms': round(float(probe.get('format', {}).get('duration') or 0) * 1000),
        'db': -99 if not rms or rms[-1] == '-inf' else round(float(rms[-1])),
        'codec': stream.get('codec_name', ''),
    }

files = sorted(os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
               for d, _, fs in os.walk(root) if '/.git' not in d + '/'
               for f in fs if f.lower().endswith(AUDIO) and os.path.relpath(d, root) != '.')
with cf.ThreadPoolExecutor(8) as ex:
    info = dict(ex.map(measure, files))

folders = {}
for rel in files:
    folder, name = rel.split('/', 1)
    v = info[rel]
    # Safari cannot decode Ogg Vorbis, so those files are left out of the browser and CHAOS.
    if v['codec'] == 'vorbis' or v['ms'] == 0:
        continue
    folders.setdefault(folder, []).append([name, v['ms'], v['db']])

out = {'repo': 'tidalcycles/Dirt-Samples', 'sha': sha,
       'note': 'name, length in ms, overall RMS in dBFS', 'folders': folders}
path = os.path.join(HERE, 'dirt-samples.json')
with open(path, 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
print(f"wrote {path}: {sum(map(len, folders.values()))} sounds in {len(folders)} folders")
