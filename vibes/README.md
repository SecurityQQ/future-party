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
  line height, and restrained tracking. Keep Cyrillic support.
- **Materials:** reflective edges around navy panels; silver primary controls;
  blue active rings; translucent ice holograms. Avoid gold controls, green terminal
  text, and rainbow gradients. Keep the original companion artwork in full color.
- **Motion:** slow orbital drift and chrome sweeps, soft entrance/reveal, no CRT
  flicker or full-screen white flash. Honor reduced motion in CSS and canvas;
  suspend the star animation while the page is hidden.
- **Interaction:** clear focus rings, readable placeholders, distinct disabled
  controls, mobile safe areas, and labeled element/finish states.

## Homepage hero reference

[Portal Space Systems on Awwwards](https://www.awwwards.com/sites/portal-space-systems)
is the reference for the homepage hero: one unframed space image, a short value
statement, understated navigation and direct routes into the content. The hero
keeps our chrome-orbit artwork, blue palette and type. The Big Wall remains the
primary action; the four routes lead to Wall, Music, Apps and Research. The Apps
cards, Slides section and shared mobile app deck keep their existing behavior.
The decorative background is static and contained by `.hero-stage`, so it does
not introduce horizontal scrolling or additional animation.

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
