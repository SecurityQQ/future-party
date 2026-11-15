# Party slides

The host's deck for Future Party 2050, 26 slides: the vision, the goal, the three rules, the NFC game, one mini demo for each of the six things on the walls and the nine stations, then predicting the future and the question for the room. Every slide has speaker notes that say how to run its demo.

**Online:** [vargafutureparty.com/slides](https://vargafutureparty.com/slides), or the Slides tab on the front page. From the folder, open `slides/dist/party-deck.html`.

## Presenting

| Key | What it does |
| --- | --- |
| → Space PageDown, or a click on the right two thirds | next click step, then the next slide |
| ← PageUp, or a click on the left third | back |
| F | full screen |
| N | speaker notes and the slide number, at the bottom |
| Home, End | first and last slide |

A presenter clicker works: it sends PageDown and PageUp. On a phone, swipe. The address keeps the slide number (`#12`), and a slide's id works too: `#tonight` opens the overview of everything at the party, `#walls` the six wall topics.

Three slides have click steps: **purple** (the blue cup turns purple when you add lemon), **berries** (sour is crossed out, sweet comes up) and **diffraction** has none but wants the room dimmed. The show reel slide plays the first 14 seconds of `video/dist/media/six-facts-720p.mp4` in a loop, muted. The Clarke slide loads the BBC Archive video from YouTube at 1:01 only when you reach it; after clicking into the player, click the slide outside it so the arrow keys work again.

The deck wears the website's Blue futurism (`vibes/README.md`): deep navy space, liquid chrome, electric blue and ice; Unbounded for headings, Geologica for reading and for the words people said, Martian Mono for labels and addresses. The cover uses the website's chrome orbit picture (`vibes/assets/chrome-orbit.webp`). The fonts come from Google Fonts. Without internet the slides fall back to the system sans serif, and the YouTube player stays empty; everything else is in the repo.

## Files

| Path | What it is |
| --- | --- |
| `deck/deck.json` | Title, slide order, sections and typefaces |
| `deck/deck.css` | The look all slides share, in Blue futurism: grounds (`dark` space, `navy` panel, `chrome` metal), the type scale, cards and doors like the website's, the arrival motion, the click steps. The palette is `vibes/tokens.css`, which the build puts in front of it |
| `deck/slides/<id>.html` | One `<section id="<id>">` per slide, notes in its `<aside>` |
| `assets/` | The pictures: the soundboard screenshot, three Kin from the party app, the Mirror 2050 effects, NASA's red-blue Mars picture (PIA24688, NASA/JPL-Caltech), six concept-art pictures at thumbnail size, the futurists' avatars, the Naval post, and `preview.jpg` (the Tonight slide, for the front page) |
| `template.html` | The player: scales the 1920×1080 slides to the window, steps through clicks, plays the clip, loads YouTube on its slide |
| `build.py` | Joins the website's tokens, the deck and the player into `dist/party-deck.html`, and checks every picture and film a slide points at |
| `dist/party-deck.html` | The built page (committed, like the other pages) |

Slides point at files by paths relative to `dist/`: `../assets/kin-ilu.jpg`, `../../video/dist/media/six-facts-720p.mp4`.

## Changing it

Edit a slide in `deck/slides/`, or the look in `deck/deck.css` (the palette itself is `vibes/tokens.css`, shared with the website), then:

```bash
python3 -I slides/build.py   # writes slides/dist/party-deck.html
python3 -I hub/build.py      # the front page: the Slides tab and its preview
```

`assets/preview.jpg` is a 1280×720 screenshot of the Tonight slide; take it again when that slide changes.

The deck was made as a claude.ai Slides artifact, [Future Party 2050](https://claude.ai/artifact/BkSJQMeXHfnDBZJaYmezXP) (private), and saved here on 15 November 2026 in the same format. Since 15 November the repo's deck wears the website's Blue futurism; the artifact keeps the first look (orange on black, League Gothic). The two also differ in three slides: here the show reel slide plays the repo's own preview film, the Clarke slide embeds YouTube's player instead of a still from the BBC video, and the 3D glasses slide points at Mars in 3D (`/mars`). A change made in one is not copied to the other.
