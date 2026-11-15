"""Build Soundtrack 2050: inject soundtrack.json and history.json into template.html,
write dist/soundtrack2050.html (the published page) and history.csv.
Run: python3 -I build.py   (from this folder)"""
import csv, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
def load(name): return json.load(open(os.path.join(HERE, name), encoding='utf-8'))
st, hist = load('soundtrack.json'), load('history.json')
tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
for key in ('__SOUNDTRACK_JSON__', '__HISTORY_JSON__'):
    assert tpl.count(key) == 1, key
js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
page = tpl.replace('__SOUNDTRACK_JSON__', js(st)).replace('__HISTORY_JSON__', js(hist))
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
open(os.path.join(HERE, 'dist', 'soundtrack2050.html'), 'w', encoding='utf-8').write(page)

# Integrity checks
ids = {t['id'] for t in st['tracks']}
recs = sorted(hist['records'], key=lambda r: r['year'])
rids = {r['id'] for r in recs}
assert len(rids) == len(recs), 'duplicate history ids'
assert len(ids) == len(st['tracks']), 'duplicate track ids'
for r in recs:
    assert r['kind'] in hist['kinds'], r['id']
    assert r.get('tie') in (None, *ids), (r['id'], r.get('tie'))
    assert r['src'].startswith('https://'), r['id']
for f in hist['forecasts']:
    for i in f['from']: assert i in rids, (f['id'], i)
for i, _ in st['top']: assert i in ids, i

names = {t['id']: f"{t['a']} — {t['t']}" for t in st['tracks']}
cols = ['year', 'when', 'title', 'kind', 'change', 'idea', 'listen', 'tie', 'sure', 'src']
with open(os.path.join(HERE, 'history.csv'), 'w', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh); w.writerow(cols)
    for r in recs:
        w.writerow([hist['kinds'][r['kind']] if c == 'kind' else names.get(r.get('tie'), '') if c == 'tie' else r.get(c, '') for c in cols])
# Page 2: Why Music Changes (eras.json -> why_template.html)
eras = load('eras.json')
wt = open(os.path.join(HERE, 'why_template.html'), encoding='utf-8').read()
assert wt.count('__ERAS_JSON__') == 1
for e in eras['eras']:
    assert set(e['forces']) == set(eras['forces']) and all(v in (0, 1, 2) for v in e['forces'].values()), e['id']
    assert e['src'] and all(u.startswith('https://') for u in e['src']), e['id']
for s in eras.get('scenarios', []):
    assert s['conf'] in ('high', 'medium', 'low') and set(s['forces']) <= set(eras['forces']), s['id']
    assert all(g['src'].startswith('https://') for g in s['signals']), s['id']
for key in ('answer', 'sketch'):
    assert eras.get(key), key
route = load('route.json')
assert wt.count('__ROUTE_JSON__') == 1 and all(i.get('yt') for i in route['items'])
why = wt.replace('__ERAS_JSON__', js(eras)).replace('__ROUTE_JSON__', js(route))
open(os.path.join(HERE, 'dist', 'why-music-changes.html'), 'w', encoding='utf-8').write(why)
print(f"built dist/why-music-changes.html ({len(why.encode())} bytes); {len(eras['eras'])} eras, {len(eras.get('scenarios', []))} scenarios")

tracks = [t for t in st['tracks'] if t.get('k') != 'voice']
print(f"built dist/soundtrack2050.html ({len(page.encode())} bytes); {len(tracks)} tracks, "
      f"{len(st['tracks']) - len(tracks)} voices, {sum(t['d'] for t in st['tracks'])//60} min; "
      f"{len(recs)} history records, {len(hist['forecasts'])} forecasts; history.csv written")
