# Mars in 3D

A station for the party with red/cyan 3D glasses: 40 real stereo pictures of Mars, taken by the rovers, landers, a helicopter and orbiters from 1997 to 2021, with a live 3D globe of Mars between the missions. One page, a loop of about 13½ minutes on a 1080p screen, that runs by itself.

Red lens on the **left** eye. The intro has a glasses test: with the right eye closed you read only LEFT, with the left eye closed only RIGHT.

## Open it

Open `mars3d/index.html` in Chrome, from disk or from the website (`/mars`, or `/mars3d`, which forwards to `/mars3d/index.html`). It needs no server and no internet: three.js is in `vendor/`, the globe's maps are in `globe/textures.js`. Only the fonts come from Google Fonts, and the page falls back to system fonts without them.

| Address | What it does |
| --- | --- |
| `#curiosity` | Starts at a mission: `pathfinder`, `spirit`, `opportunity`, `phoenix`, `curiosity`, `perseverance`, `orbit` |
| `?globe` | Opens on the globe alone: drag to turn it, scroll to zoom |
| `?captions=0` | No captions |
| `?relief=10` | How many times the globe's mountains are raised (10 by default) |
| `?auto=8` | Starts on autopilot, a new picture every 8 seconds (any number from 3 to 120); press `F` or the Autopilot button for the full screen, which a browser only gives to a click or a key |

**Keys:** `A` autopilot · `+` `−` its seconds · `→` `←` next and back (or click the right or left half) · `Space` pause · `F` full screen · `C` captions · `G` globe only · `1`–`7` missions · `T` glasses test · `D` / `Shift D` more or less depth on the globe · `I` keys and every source.

## How it plays

**Autopilot** (the button at the top right, or `A`): the full screen, and a new picture every few seconds, 8 by default. The chip next to the button (or `+` and `−`) picks 5, 8, 12 or 20 seconds, and the page remembers the choice. Mission cards keep at least 6 seconds so the globe can turn to the landing site, the intro and outro at least 10. A panorama has no time for its whole pan, so it shows a slow look across its middle. The buttons and keys come back when the mouse moves or the screen is tapped (that tap does not press a button); `Esc`, the button or `A` leave. On an iPhone, which has no full screen for pages, autopilot only sets the pace.

Without autopilot:

1. **Intro:** the globe turns, with Phobos (much enlarged) passing in front of it, and the glasses test.
2. **Seven missions**, in order: Mars Pathfinder (1997), Spirit, Opportunity, Phoenix, Curiosity, Perseverance with Ingenuity, then stereo from orbit (Mars Express, Mars Reconnaissance Orbiter, Rosetta's fly-by). For each, the globe turns to the landing site and a pin stands out of the surface, then the mission's pictures follow.
3. **Pictures:** panoramas wider than about 2:1 fill the screen height and pan from left to right; the others fit the screen and drift in slowly. A caption gives the title, when, and one line.
4. **Outro**, then it starts again.

## Where the pictures come from

Every picture is an anaglyph its agency made from a real stereo pair: two cameras side by side on a rover's mast, or one camera on an orbiter or the Ingenuity helicopter photographing a place twice from different angles. 35 are NASA pictures from the [NASA Image and Video Library](https://images.nasa.gov) (public domain), 5 are ESA pictures from Wikimedia Commons (CC BY-SA 3.0 IGO). `CREDITS.md` lists each with its source and credit line; the `I` panel in the page shows the same list. The pictures are only cropped (to cut away black or one-eye mosaic edges) and resized.

The globe is coloured with the Viking MDIM 2.1 mosaic (NASA/JPL/USGS) and raised with the MOLA laser-altimeter heights (NASA/GSFC), both public domain, ten times higher than real so the volcanoes and Valles Marineris read in depth. It is drawn twice, once per eye, and mixed into red/cyan with Dubois' matrices.

## Change it

`slides.json` is the show: the missions, their landing sites and the pictures with their captions. A picture's `crop` cuts it by hand (`[x0, y0, x1, y1]` in fractions) where the automatic trim is not enough; `false` keeps it whole. After a change:

```bash
python3 -I mars3d/tools/fetch.py   # downloads the originals and their records into mars3d/raw/ (not committed)
python3 -I mars3d/tools/build.py   # writes img/, globe/textures.js, slides.js, CREDITS.md, preview.jpg
```

`fetch.py` takes NASA pictures by their PIA number from images.nasa.gov; an ESA picture needs its Commons file name added to `COMMONS` in the script. The pictures are saved as JPEG without chroma subsampling, because the usual 4:2:0 blurs the red and cyan channels into each other and the 3D ghosts.

## Notes for the night

- Use a dark room and the brightest, least sharpened picture mode of the projector or TV; ghosting gets worse with high contrast and sharpening.
- Cardboard red/cyan glasses are enough. Red/blue glasses work too; red/green ones darken the colour pictures.
- The 3D needs no warm-up, but a few guests do not see stereo at all. The pictures still work flat for them.
