# Future Party 2050

Material for a party set in 2050: a looping wall film, the soundtrack, and the research behind them.

## What is here

| Folder | What it is |
| --- | --- |
| `video/` | **Already Here**, a 95-second silent loop for a projector (1920×1080, 30 fps). Every shot pairs an idea a film imagined with a real photograph of it existing today, in three chapters: The City, The Machines, Beyond. Built with [HyperFrames](https://hyperframes.heygen.com). See `SPEC.md` for the design and `REVIEW.md` for the QA pass. |
| `music/` | **Soundtrack 2050** and **Why Music Changes**: data (`soundtrack.json`, `history.json`, `eras.json`) and the templates that build the two pages in `dist/`. |
| `reel/` | Research for a film-clip reel: the brief, candidate scenes, links and the rules for rejecting clips. |

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

## Credits and licences

All photographs are from Wikimedia Commons: public-domain works (mostly NASA) and CC BY / CC BY-SA images credited on screen. The full list with authors and licences is in [`video/CREDITS.md`](video/CREDITS.md) and `video/assets/photos/credits.json`. Each photo keeps its own licence. The films are named in the video, never shown.
