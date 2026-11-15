# Future Party 2050

Material for a party set in 2050: a looping wall film, the soundtrack, and the research behind them.

## What is here

| Folder | What it is |
| --- | --- |
| `video/` | **Already Here**, a 95-second silent loop for a projector (1920×1080, 30 fps). Every shot pairs an idea a film imagined with a real photograph of it existing today, in three chapters: The City, The Machines, Beyond. Built with [HyperFrames](https://hyperframes.heygen.com). See `SPEC.md` for the design and `REVIEW.md` for the QA pass. |
| `music/` | **Soundtrack 2050** and **Why Music Changes**: data (`soundtrack.json`, `history.json`, `eras.json`) and the templates that build the two pages in `dist/`. |
| `reel/` | Research for a film-clip reel: the brief, candidate scenes, links and the rules for rejecting clips. |
| `soundboard/` | **Contact 2050**, a Makey Makey soundboard: twelve pins, eight kits, and 2,038 sounds from TidalCycles' [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) library. Jam mode keeps everything in time and in key; stage mode is for the projector. A sub-project with its own [README](soundboard/README.md). |

## The film

The rendered MP4 is attached to the [latest release](../../releases/latest).

To preview or re-render it yourself (Node.js and ffmpeg):

```bash
cd video
npm run dev       # preview in the browser
npm run check     # lint, layout, motion and contrast checks
npm run render    # render to renders/
```

`tools/build.py` regenerates the chapter compositions from `slides.json`. `tools/fetch_picks.py` re-downloads the chosen photos from Wikimedia Commons into `assets/raw/` and prepares them in `assets/photos/`.

## The music pages

```bash
cd music
python3 -I build.py   # writes dist/soundtrack2050.html and history.csv
```

## The soundboard

Open `soundboard/dist/contact2050.html` in Chrome, plug in the Makey Makey, hold EARTH and touch a pin. Press Enter for stage mode on the projector.

It has eight kits, from Liftoff and Rave 2050 to Magic Keys, a horn section you can't play wrong. Jam mode keeps every touch in time and in key, and the beat builds and falls with how busy the room is. The look is space, kept minimal: a black sky that follows the music, with a planet's rim in the colour of the chord and an animation for each pin.

[`soundboard/README.md`](soundboard/README.md) has the kits, the build commands and the files, and [`soundboard/JAM.md`](soundboard/JAM.md) explains how jam mode works.

```bash
cd soundboard
python3 -I build.py             # writes dist/contact2050.html, which streams sounds from the jsDelivr CDN
python3 -I build.py --offline   # also writes dist/contact2050-offline.html with the sounds built in, for a venue without wifi
```

## Credits and licences

All photographs are from Wikimedia Commons: public-domain works (mostly NASA) and CC BY / CC BY-SA images credited on screen. The full list with authors and licences is in [`video/CREDITS.md`](video/CREDITS.md) and `video/assets/photos/credits.json`. Each photo keeps its own licence. The films are named in the video, never shown. The soundboard plays [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) pinned to commit `c74fc80`. That repo has no licence file, so its audio is streamed rather than committed here, and the offline copy is built locally and git-ignored.
