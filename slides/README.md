# Party slides

The host's deck for Varga Future Party 2050, 27 slides: the vision (20 people, then 50), the goal, the three rules, the App, the six topics on the walls with one slide each, everything at the party with a picture of each and a mini demo for each of the nine stations, then predicting the future and the question for the room. Every slide has speaker notes that say how to run its demo.

**Online:** [vargafutureparty.com/slides](https://vargafutureparty.com/slides), or the Slides tab on the front page. From the folder, open `slides/dist/party-deck.html`.

## Presenting

| Key | What it does |
| --- | --- |
| → Space PageDown, or a click on the right two thirds | next click step, then the next slide |
| ← PageUp, or a click on the left third | back |
| F | full screen |
| N | speaker notes and the slide number, at the bottom |
| Home, End | first and last slide |

The App slide (`#app`, "We are all cyborgs") loops a six-second animation: a phone taps a party chip, a round NFC tag drawn in chrome (coil antenna, chip and bridge), the coil lights up, and a Kin appears on the phone's screen, which is the live app's pass scanner. Next to it is a QR code for vargafutureparty.com. The six inspiration slides each name their page on the website in the same place, top right (bottom on the quotes slide), and the addresses are links.

A presenter clicker works: it sends PageDown and PageUp. On a phone, swipe. The address keeps the slide number (`#12`), and a slide's id works too: `#tonight` opens the overview of everything at the party, `#walls` the six wall topics.

Three slides have click steps: **purple** (the blue cup turns purple when you add lemon), **berries** (sour is crossed out, sweet comes up) and **diffraction** has none but wants the room dimmed. The show reel slide plays the first 14 seconds of `video/dist/media/six-facts-720p.mp4` in a loop, muted. The Clarke slide loads the BBC Archive video from YouTube at 1:01 only when you reach it; after clicking into the player, click the slide outside it so the arrow keys work again.

The deck wears the website's Blue futurism (`vibes/README.md`): deep navy space, liquid chrome, electric blue and ice; Unbounded for headings, Geologica for reading and for the words people said, Martian Mono for labels and addresses. The cover uses the website's chrome orbit picture (`vibes/assets/chrome-orbit.webp`). The fonts come from Google Fonts. Without internet the slides fall back to the system sans serif, and the YouTube player stays empty; everything else is in the repo.

## Files

| Path | What it is |
| --- | --- |
| `deck/deck.json` | Title, slide order, sections and typefaces |
| `deck/deck.css` | The look all slides share, in Blue futurism: grounds (`dark` space, `navy` panel, `chrome` metal), the type scale, cards and doors like the website's, the arrival motion, the click steps. The palette is `vibes/tokens.css`, which the build puts in front of it |
| `deck/slides/<id>.html` | One `<section id="<id>">` per slide, notes in its `<aside>` |
| `assets/` | The pictures, listed under **Pictures** below, and `preview.jpg` (the Tonight slide, for the front page) |
| `template.html` | The player: scales the 1920×1080 slides to the window, steps through clicks, plays the clip, loads YouTube on its slide |
| `build.py` | Joins the website's tokens, the deck and the player into `dist/party-deck.html`, and checks every picture and film a slide points at |
| `tools/nfc_tag.py` | Draws the round NFC tag on the App slide as inline SVG (`--write` puts it into `deck/slides/app.html`) |
| `dist/party-deck.html` | The built page (committed, like the other pages) |

Slides point at files by paths relative to `dist/`: `../assets/kin-ilu.jpg`, `../../video/dist/media/six-facts-720p.mp4`.

## Changing it

Edit a slide in `deck/slides/`, or the look in `deck/deck.css` (the palette itself is `vibes/tokens.css`, shared with the website), then:

```bash
python3 -I slides/build.py   # writes slides/dist/party-deck.html
python3 -I hub/build.py      # the front page: the Slides tab and its preview
```

`assets/preview.jpg` is a 1280×720 screenshot of the Tonight slide; take it again when that slide changes.

The deck was made as a claude.ai Slides artifact, [Future Party 2050](https://claude.ai/artifact/BkSJQMeXHfnDBZJaYmezXP) (private), and saved here on 15 November 2026 in the same format. Since 15 November the repo's deck wears the website's Blue futurism; the artifact keeps the first look (orange on black, League Gothic). Since the review of 15 November the repo's deck has more: the vision in two slides (20, then 50), the App instead of the NFC chip game (with the scan animation, "We are all cyborgs" and the QR code), a picture on every topic card, idea and station, Kevin Kelly's photo on the quotes slide, Naval's post on the tweets slide (so the predicting slide quotes his words instead of showing the post again), new concept art, the robot's photo, and the website's address on every inspiration slide. The artifact has none of this, and it also differs in three slides: here the show reel slide plays the repo's own preview film, the Clarke slide embeds YouTube's player instead of a still from the BBC video, and the 3D glasses slide points at Mars in 3D (`/mars`). A change made in one is not copied to the other.

## Pictures

| Files | What they are |
| --- | --- |
| `app-phone.jpg`, `st-app.jpg` | The live app at vargafutureparty.com/app on a phone (430 px wide, signed out: the pass scanner), 15 November 2026 |
| `soundboard.jpg`, `st-play.jpg` | Play 2050 (`soundboard/dist/contact2050.html`), full page and a square of its pads |
| `st-mirror.jpg`, `mirror-effects.jpg` | Mirror 2050: the Holo Cube tile of `hub/apps/mirror.jpg`, and the eight effects from the posts on X they come from |
| `reel-still.jpg` | The Six Facts film at 5 s (`video/dist/media/six-facts-720p.mp4`, the blue cut) |
| `topic-quotes.jpg`, `topic-tweets.jpg`, `topic-futurists.jpg` | The topic cards: a crop of the quote wall, of Naval's post (`naval-2050.png`), and the twelve futurists' avatars (`av-*.jpg`) in one picture |
| `kevin-kelly.jpg` | Kevin Kelly by Christopher Michel, CC BY-SA 4.0, from Wikimedia Commons (`File:Kevin_Kelly_by_Christopher_Michel_1.jpg`) |
| `art-1.jpg` … `art-6.jpg` | Concept art from the Imagined Futures wall (`concept-art/tweets.json`): Rick Guidice for NASA, Annibale Siconolfi, Erik van Helvoirt, Karl Schulschenk, Paul Chadeisson, Neil Blevins |
| `idea-*.jpg`, `st-tea.jpg`, `st-berries.jpg`, `st-dumplings.jpg`, `st-printer.jpg`, `st-glasses3d.jpg`, `st-diffraction.jpg` | **Made with AI** for this deck (varg.ai, GPT Image 2.6, 15 November 2026): the four ideas of 2050 and the stations that are things, not apps. The speaker notes of the Ideas and Tonight slides say so |
| `robot.jpg` | The party's robot, the host's photo |
| `qr-site.svg` | QR code for https://vargafutureparty.com (segno, error level Q) |
| `kin-*.jpg`, `av-*.jpg`, `mars-3d.jpg`, `naval-2050.png` | Three Kin from the party app, the futurists' avatars from X, NASA's red-blue Mars picture (PIA24688, NASA/JPL-Caltech), Naval's post of 25 September 2018 |
