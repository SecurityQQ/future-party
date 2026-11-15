# Future Party 2050

Material for a party set in 2050: the wall films, the slide walls, the programme, the soundtrack, a soundboard for the guests, and the research behind them. Everything for the night lives in this one repo.

**Online:** [future-party-2050.vercel.app](https://future-party-2050.vercel.app) lists every resource and opens each one, with no login.

## What is here

Start at **`index.html`**, the front page: an index of every resource, the films on a loop, each slide wall, the programme, the soundtrack, the research pages and the pre-flight list for the projector laptop. It works offline from this folder. Rebuild it with `python3 -I hub/build.py` after any other piece changes. The website is the same page in web mode (see [The website](#the-website)).

| Folder | What it is |
| --- | --- |
| `video/` | **Further** (v2), a 75-second silent loop for a projector (1920×1080, 30 fps): 16 bold claims for 2030–2050, each with a dated real seed and a film that imagined it, over 37 free images. The first cut, **Already Here** (v1), is kept and can be rebuilt. Built with [HyperFrames](https://hyperframes.heygen.com). See `ROAST.md` for the scene-by-scene roast of v1, `SPEC.md` and `REVIEW.md` for design and QA, and `CREDITS.md` for every image. |
| `video/dist/further-2050.html` | **The Further page**: both films (720p previews in `video/dist/media/`), the roast with a frame from every v1 slide, the 16 new claims with their sources, and how far to trust them. Opens from disk in any browser. |
| `roast/` | **The Roast**, a 63-second film with sound that tells how v1 became v2: 11 v1 slides stamped CUT or KEEP, the tally, then the recut. Its own HyperFrames project (`SPEC.md`, `REVIEW.md`). |
| `showreel/` | **Six Facts**, the show reel: two and a half minutes with music that cut together the six facts about how books guess the future, six quotes from the books, six posts from X, 13 predictions from *Further* and NASA footage (the Artemis I and Saturn V launches, the Sun, Earth and a hurricane from the ISS). Its own HyperFrames project (`SPEC.md`, `STORYLINES.md`, `REVIEW.md`, `CREDITS.md`). |
| `programme/` | **Tea With Tomorrow**, the programme for the evening: a three-hour Futures Literacy Lab (the UNESCO method) with tea on the tables, in two lengths, with a party clock for the host. |
| `slides/` | **Party slides**, the host's deck: 26 slides with the vision, the goal, the three rules, a mini demo for each wall topic and each station (soundboard, camera, teas, miracle berries, 3D and diffraction glasses …), and the 2050 question, with speaker notes. A full-screen player in one page; its own [README](slides/README.md). |
| `music/` | **Soundtrack 2050** and **Why Music Changes**: data (`soundtrack.json`, `history.json`, `eras.json`) and the templates that build the two pages in `dist/`. `music/resonance/` is **Resonance**, music history and what comes next, with an in-page YouTube player. |
| `soundboard/` | **Contact 2050**, a Makey Makey soundboard: twelve pins, eight kits, and 2,038 sounds from TidalCycles' [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) library. Jam mode keeps everything in time and in key; stage mode is for the projector. A sub-project with its own [README](soundboard/README.md). |
| `books/` | **Book Projection 2050**: 18 books about the world around 2050, 25 idea slides and 50 verified verbatim quotes, with a fullscreen wall projection. `quotes.json` is the quote list in play order; `template.html` holds the books and ideas. |
| `tweets/` | **2050 in 78 Tweets**: what futurists and others wrote on X about 2050, word for word, with each author's photo, name and role. A fullscreen tweet wall plays them in five blocks (Machines, Planet, People, Power, Beyond); the page also lists and filters every tweet. `tweets.json` is the source. `tweets/research/` holds the research behind it: **Futurists on 2050** (the full version) and **2050 in Futurists' Tweets** (the short one, in English and the Russian original). |
| `reel/` | Research for a film-clip reel: the brief, candidate scenes, links and the rules for rejecting clips, and **Projection 2050** (`projection-2050.html`), eighteen films about 2050 scored for plausibility and beauty. |
| `astrology/playground/` | **Zodiac Creatures**, a local tool for tuning the prompt behind the zodiac companion characters. Needs a local server; see its [README](astrology/playground/README.md). |
| `hub/` | The front page and the website: `template.html`, `build.py` (reads the counts and film lengths from the other folders and writes `index.html`) and `site.py` (writes `site/` for Vercel). |

The programme, the two futurist research pages and Projection 2050 were made as claude.ai pages. The files here are saved copies of them (14 November 2026), and they have no build: to change one, save the page again.

## The films

The 1080p masters are on the releases: **Already Here** on [v1.0](../../releases/tag/v1.0), **Further** and **The Roast** on [v2.0](../../releases/tag/v2.0). The repo keeps 720p previews of these three and of **Six Facts** in `video/dist/media/`, which the front page plays when the masters are not in `video/renders/` and `roast/renders/`, and which the website always plays.

To preview or re-render the wall film yourself (Node.js and ffmpeg):

```bash
cd video
npm run dev       # preview in the browser
npm run check     # lint, layout, motion and contrast checks
npm run render    # render to renders/
```

`tools/build.py` regenerates the chapter compositions from `slides.json`. `tools/fetch_picks.py` re-downloads the chosen photos from Wikimedia Commons into `assets/raw/` and prepares them in `assets/photos/`.

## The Further page and the roast film

```bash
cd video
python3 -I tools/page.py --frames   # takes frames from the v2 render, writes dist/further-2050.html

cd ../roast
python3 -I tools/build.py   # writes the compositions from tools/build.py
npm run check && npm run render
```

The page plays the two films from `video/dist/media/` (720p, in the repo).

## The show reel

**Six Facts** plays the party's material as one film: each of the six facts from the book page arrives as a number over NASA footage, a book answers it, someone on X answers the book, and two slides from *Further* show how far it goes. It is cut on the bars of the score.

```bash
cd showreel
python3 -I tools/fetch_footage.py    # downloads the NASA fragments listed in footage.json into assets/footage/
python3 -I tools/prepare_assets.py   # cuts the Further slides, trims the score, copies photos, sounds and fonts
python3 -I tools/build.py            # writes index.html, compositions/ and CREDITS.md from reel.json
npm run check && npm run render      # renders to renders/
```

`reel.json` holds everything on screen: the facts, the quotes, the posts, which slides and footage each chapter uses, and the downbeat of every bar. The build stops if a quote is not word for word in `books/quotes.json` or a post is not word for word in `tweets/tweets.json`. The footage and the slide cuts are not in the repo (about 250 MB); the two tools above fetch and cut them again. The slides are cut from the *Further* master in `video/renders/`, or from release v2.0 when it is not there. `CREDITS.md` lists every fragment with its NASA page.

The 1080p render is `showreel/renders/six-facts-2050-1080p.mp4`; it is not on a release yet. The repo keeps a 720p preview in `video/dist/media/six-facts-720p.mp4`.

## The music pages

```bash
cd music
python3 -I build.py   # writes dist/soundtrack2050.html and history.csv

cd resonance
python3 -I build_resonance.py   # writes dist/local/index.html, the Resonance page
```

## The party slides

Open `slides/dist/party-deck.html` (on the website, `/slides`). → or a click goes on, ← goes back, F is full screen, N shows the speaker notes. [`slides/README.md`](slides/README.md) has the keys, the demos and the files.

```bash
python3 -I slides/build.py   # writes slides/dist/party-deck.html from slides/deck/
```

## The soundboard

Open `soundboard/dist/contact2050.html` in Chrome, or [/soundboard](https://future-party-2050.vercel.app/soundboard) on the website, plug in the Makey Makey, hold EARTH and touch a pin. Press Enter for stage mode on the projector.

It has eight kits, from Liftoff and Rave 2050 to Magic Keys, a horn section you can't play wrong. Jam mode keeps every touch in time and in key, and the beat builds and falls with how busy the room is. The look is space, kept minimal: a black sky that follows the music, with a planet's rim in the colour of the chord and an animation for each pin.

[`soundboard/README.md`](soundboard/README.md) has the kits, the build commands and the files, and [`soundboard/JAM.md`](soundboard/JAM.md) explains how jam mode works.

```bash
cd soundboard
python3 -I build.py             # writes dist/contact2050.html, which streams sounds from the jsDelivr CDN
python3 -I build.py --offline   # also writes dist/contact2050-offline.html with the sounds built in, for a venue without wifi
```

## The book page

```bash
cd books
python3 -I build.py   # writes dist/book-projection-2050.html (the published page) and dist/quote-wall.html
```

`dist/quote-wall.html` opens in any browser without signing in. Add `#quote-wall`, `#projection` or `#mix-wall` to its address to start the quotes, the ideas or both, then press F for fullscreen. Each quote in `quotes.json` records how it was checked (`conf` 3 = against the book text, 2 = two or more matching sources) and its source links.

## The tweet wall

```bash
cd tweets
python3 -I build.py   # writes dist/tweets-2050.html (the published page) and dist/tweet-wall.html
```

`dist/tweet-wall.html` opens in any browser without signing in. Add `#tweet-wall` (all 78, about 18 minutes per loop) or `#short-wall` (the 40 short ones, about 8 minutes) to its address, then press F. Tweet texts in `tweets.json` are verbatim from the X API; a long tweet can carry `wall`, word-for-word excerpts that the build checks against the full text. Profile pictures are in `avatars/`.

## The website

[future-party-2050.vercel.app](https://future-party-2050.vercel.app) is built from this repo by Vercel. `vercel.json` runs `python3 -I hub/site.py`, which writes `site/`:

- `index.html` is the front page in web mode: it plays the 720p previews, links the 1080p masters on the releases, and opens Markdown files on GitHub.
- Every page keeps its path from the repo, so `/books/dist/quote-wall.html#quote-wall` is the quote wall. A page saved as a claude.ai fragment gets a full document shell, and every link to a claude.ai copy of one of these pages points at the copy on the site. The one left on claude.ai is the tea comparison sheet.
- Short addresses for typing on the projector laptop: `/quotes`, `/ideas`, `/mix`, `/tweets`, `/tweets-short`, `/programme`, `/soundboard`, `/soundtrack`, `/resonance`, `/music-history`, `/books`, `/further`, `/films`, `/futurists`, `/slides`. They are listed in `SHORT` in `hub/build.py`.

To check it locally:

```bash
python3 -I hub/site.py                 # writes site/ (git-ignored)
python3 -m http.server 4610 -d site    # then open http://localhost:4610
```

To add a resource, put its page in the repo, add it to `PAGES` (and, for a claude.ai page, to `ONLINE`) and to `resources()` in `hub/build.py`, then rebuild. `.vercelignore` limits a `vercel deploy` from this folder to the folders `site.py` reads.

## Credits and licences

All photographs are from Wikimedia Commons: public-domain works (mostly NASA) and CC BY / CC BY-SA images credited on screen. The full list with authors and licences is in [`video/CREDITS.md`](video/CREDITS.md) and `video/assets/photos/credits.json`. Each photo keeps its own licence. The films are named in the video, never shown. The soundboard plays [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) pinned to commit `c74fc80`. That repo has no licence file, so its audio is streamed rather than committed here, and the offline copy is built locally and git-ignored.
