# SPEC: Six Facts (the Future Party 2050 show reel)

GOAL:    A guest who watches once believes the books about 2050 were checked, not just written, and
         leaves on "Which one will you build?".
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, H.264 MP4 with sound.
TIME:    149.5 s = 4,485 frames. "Call to Adventure", 85.6 BPM, about 21 frames a beat, 84 a bar.
         The cut uses the downbeats `hyperframes beats` found (reel.json "bars"), not a computed grid,
         because the tempo drifts between 83.5 and 87.9 BPM.

LOOK
- The wall films' look, in the site's blue since release v3.0. Ground #030817 only on the end of the last slide.
  Ink #edf4ff. Accent ice #9dd8ff on kicker lines (Martian Mono) and the big numbers: "FACT 1 / 6", the book and its
  year, the handle and date. Text in Geologica, numbers and titles in League Gothic, quotes in Instrument Serif.
- Medium: real footage, full-bleed, cut to 1920 x 1080 at 30 fps. Under a fact the footage is at full
  strength behind a scrim that covers the left 66% (0.80 to 0.18 opacity) and the bottom half (to 0.60),
  so the right and top of every shot stay clean. Under a quote it is dimmed 60%, under a tweet 74%.
- Type: fact number League Gothic 300 px (27.8% of height). Fact sentence Inter 600, 46 px, at most
  1160 px wide. Source Inter 500, 28 px. Quote Instrument Serif 104 px (92 px over 84 characters),
  the serif of the book wall. Tweet Inter 600, 70 px (60 px over 120 characters), with `calt` off so
  "24x7" stays as written. Kickers Inter 800, 34 px, +0.1em.
- Layout: captions anchored left at x = 192 px. Facts sit low (bottom 112 px), quotes and tweets are
  centred on the height. Only the end card is centred, as in the wall films.

OBJECTS
- Six numbers: 71%, 1972, 8.1 vs 10.3, 119 Gt, 38, 86% vs 7%.
- 26 footage fragments (footage.json): the Artemis I launch, a Saturn V launch, the Sun from SDO,
  Earth and Hurricane Milton from the ISS, Greenland from Operation IceBridge, the Black Marble night
  lights, and NASA's simulation of carbon dioxide. Each is the real thing, never drawn.
- 13 slides from Further, cut from the 1080p master with their own captions and credits.
- Six book quotes and six tweets, word for word, with the author's name, role, photo and date.

MOTION
- A section is two bars (5.5 to 5.8 s). A chapter is four sections: fact, quote, tweet, two slides.
  The order changes so the slides land on the music: FQTP, FPQT, FPQT, FQTP, FPQT, FTQP.
- Fact: hard cut on the downbeat. The number is on screen with the cut; the footage lands under it,
  scale 1.10 to 1 in 0.55 s, expo.out. 71, 119 and 38 count up in 1.2 s, power2.out. "vs" lands on
  beat 2 and the second number on beat 3 as a 0 ms set. The sentence arrives per word, blur 6 px to 0
  in 0.13 s, 0.036 s apart. The second shot cuts in on the next bar.
- Quote: comes in on a zoom cut (out 1 to 1.30 in 0.17 s power3.in, in 1.24 to 1 in 0.32 s power3.out).
  Words turn from 24% to ink, 0.075 s apart, no move. The footage pushes 1.00 to 1.07 across the section.
- Tweet: comes in on a dip cut (the outgoing shot darkens 42% for 3 frames). The photo pops, scale 0.6
  to 1, back.out(1.6); the text blurs in whole, 10 px to 0 in 0.22 s.
- Slides: come in on a push, both shots travelling together for 8 frames around the bar, power2.inOut.
  The direction alternates by chapter.
- Every caption leaves 0.22 s before its section ends, blur 0 to 8 px and fade in 0.15 s. Landed text
  is dead still.

SHOTS (seconds)
- 0.0-5.6      title on the Artemis I glow, already on screen at frame 0; "18 books · 78 tweets ·
               16 predictions for 2050" at 1.0
- 5.6-27.9     1 / 6: 71% (the Sun, a solar array over Earth) · The Future We Choose · Ramez Naam ·
               fusion, the ozone layer
- 27.9-50.2    2 / 6: 1972 (Saturn V) · the collider, the asteroid, on the first theme · The Limits to
               Growth · Vinod Khosla
- 50.2-72.5    3 / 6: 8.1 vs 10.3 (night lights) · the torus, Mars · 2052 · Elon Musk
- 72.5-94.9    4 / 6: 119 Gt (carbon dioxide) · Drawdown · Vinod Khosla · Jewel, mammoths
- 94.9-117.2   5 / 6: 38 (Hurricane Milton) · Starship, the elevator · The Ministry for the Future ·
               Kevin Kelly
- 117.2-139.6  6 / 6: 86% vs 7% (Artemis I) · Peter Diamandis · The Singularity Is Nearer · the
               telescope, the light sail
- 139.6-143.4  "Every future starts here", on the last chord
- 143.4-149.5  2050 · "Which one will you build?" · credits, over the limb of Earth

SOUND
- Score: "Call to Adventure", Kevin MacLeod, CC BY 4.0, from 0.065 s (its first downbeat), cut 2.5 dB
  and limited to -1.5 dBTP, faded out over the last 5 s.
- Six low impacts, one a frame after each fact's cut, two takes alternating, each set 2 to 4 dB over the
  music it lands on (volume 0.16 under the quiet opening, 0.40 under the climax). Six short whooshes, one
  into each pair of slides. One riser into the last chord, with an impact.

BANNED
- The generated-video defaults: a dark void with small floating text, glow, particles, glass cards,
  everything centred, fade-and-slide-up on every element, text that moves while read.
- CSS filters on footage. Crossfades between shots. White flashes. More than 3 cuts a second.
- Scenes from the films. The films are named on the slides, never shown: every fragment is real footage.
- Words that are not in the source: a quote or a tweet may be shortened, never reworded, and the build
  refuses anything it cannot find word for word in books/quotes.json or tweets/tweets.json.

QA
- `npm run check` with 0 errors.
- Frames to check from the MP4: 0.0 (title readable, not black), the middle of every fact, quote,
  tweet and slide, both sides of one push, 142.0 (last slide) and 147.0 (end card and credits).
- `hyperframes audio` on the MP4: sound present, between -16 and -14 LUFS, peak under -1 dBTP.
