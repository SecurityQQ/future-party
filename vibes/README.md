# Blue futurism

The shared visual direction for **The Future 2050** (`app/`), the party
hub, and Resonance: deep navy space, liquid chrome, electric blue, ice reflections,
and alien companions. The images
in this folder are the moodboard. `115185f178413a7827be3f9a8ec4942f.jpg` supplies
the chrome orbital texture; `assets/chrome-orbit.webp` is its optimized web copy.

## System

- **Space:** `#030817`; surfaces `#07132b` / `#0b1b36`.
- **Light:** `#edf4ff` text, `#a2b6d4` secondary text, `#4385ff` electric blue,
  `#9dd8ff` ice, and `#dce9fb` chrome. Warm colors are reserved for warnings/errors.
- **Type:** Unbounded for short headings, Geologica for readable body copy,
  Martian Mono for coordinates and metadata. Use normal-width body type, relaxed
  line height, and restrained tracking. Keep Cyrillic support. On a page, every
  card title is Geologica 600; Unbounded is for page, section and feature titles.
  League Gothic is the projection face: only in what plays on the wall (the films
  and the Big Wall's slides, and pictures of them), never for a page's own text.
  Instrument Serif only for the books' words.
- **Films:** the four films (Further, Six Facts, Already Here, The Roast) use the
  Big Wall's slide look: navy ground, ice kickers and numbers in Martian Mono,
  Geologica lines, League Gothic titles, navy scrims over photographs. Their
  generators share the same `GROUND, ACCENT, INK` and font faces.
- **Materials:** reflective edges around navy panels; silver primary controls;
  blue active rings; translucent ice holograms. Avoid gold controls, green terminal
  text, and rainbow gradients. Keep the original companion artwork in full color.
- **Motion:** slow orbital drift and chrome sweeps, soft entrance/reveal, no CRT
  flicker or full-screen white flash. Honor reduced motion in CSS and canvas;
  suspend the star animation while the page is hidden.
- **Interaction:** clear focus rings, readable placeholders, distinct disabled
  controls, mobile safe areas, and labeled element/finish states.

## Homepage hero

The front page opens as a party poster: FUTURE / PARTY / 2050 on three lines,
large Unbounded type and the chrome-orbit artwork across the stage. Keep the
name as the headline, with no marketing lead or benefit statement. The original
chrome Big Wall button, History of Music link, app pill and four section buttons
keep their materials, names and destinations; the section buttons carry only a
short factual detail. Content below the hero keeps its existing layout and behavior.

The artwork moves (the last script in `hub/template.html`): a WebGL canvas takes the
picture's box, crop, opacity and mask, starts as the still picture, then flows it like
liquid metal, lets the stars twinkle and the bubbles glint, bends the chrome around a
mouse pointer and sends a chrome sweep across the poster, 2050 included, every 12 s.
Reduced motion keeps the still picture; without WebGL, or opened from the folder as a
file, the picture drifts slowly in CSS. It draws only while the hero is on screen.

## Source of truth

`tokens.css` owns the palette, chrome materials, and timing. App components and
layout remain in `app/`; `app/globals.css` imports the token copy.
The Next app has an isolated build root, so the two shared assets are deliberately
copied into it and committed. No parent-folder import or runtime CDN is needed.

The hub inlines these tokens through `hub/build.py` and ships the texture with
`hub/site.py`. Resonance reads the same tokens and embeds the texture through
`music/resonance/patch_style.py`, so its standalone and hub-hosted pages share
the same appearance. The party slides (`slides/`) put the tokens in front of
`slides/deck/deck.css` through `slides/build.py`. Imagined Futures (`concept-art/`, its page and its `#wall`)
inlines them through `concept-art/build.py`. The compact History controls and Music of the Future card
view live in `patch_history_layout.py` / `history-layout.css` and
`patch_future_layout.py` / `future-layout.css`. Edit these sources, then regenerate
the HTML.

The pages first made in the earlier orange look (Inter, JetBrains Mono, `#ff5315`):
Book Projection and the quote wall, the tweets and the tweet wall, the futurists research, Soundtrack 2050,
Why Music Changes, Projection 2050, Further, the Mirror research, Tea With Tomorrow, Mirror 2050 and Play 2050,
wear Blue futurism through `restyle.py`. It puts `tokens.css` and `pages.css` (the old variable names pointed
at the tokens, the page title in Unbounded with a chrome word, chrome primary buttons, dark only) into each page,
swaps the fonts and the old orange and near-black literals, and puts the party's mark (FUTURE PARTY / 2050) at
the top left, linking back to the page's section on the front page. The builds of `books/`, `tweets/`, `music/`,
`soundboard/` and `video/tools/page.py` call it on what they write, `hub/site.py` calls it on every page it
publishes, and the hand-made pages are kept restyled in the repo:

```sh
python3 -I vibes/restyle.py          # restyle every page in its PAGES list
python3 -I vibes/restyle.py --check  # exit 1 if a page is not restyled
```

A new page made in the old look goes in `PAGES` in `restyle.py`. Page-specific fixes go in `pages.css` under
`:root[data-vibe="<name>"]`. Mars in 3D keeps its red/cyan accents on black (they are for the 3D glasses). League Gothic stays on the
Big Wall's slides and in the films; the pages about them (the wall's start screen, the Further notes, the
webcam research) use Unbounded like every other page.

After editing tokens or the optimized texture, run from the repository root:

```sh
python3 vibes/sync.py
python3 vibes/sync.py --check
cd app
npm run typecheck
npm run build
```

For the static sites, run from the repository root:

```sh
python3 -I music/resonance/build_resonance.py
python3 -I hub/build.py
python3 -I hub/site.py
```

Review `/`, `/scan`, `/login`, `/leaderboard`, and a public character card at narrow
and wide widths. Include keyboard focus and reduced motion. Emails use matching
inline colors for clients without CSS variable support.

Also review the hub and Resonance at narrow and wide widths. In Resonance,
check History, Music of the Future, Library, Research, detail panels, and radio controls.
Both existing Vercel projects should be deployed from the same generated build.
