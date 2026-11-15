# SPEC: Already Here (Projection 2050 loop)

GOAL:    A guest glancing at the wall believes 2050 is plausible and beautiful: every shot pairs
         an idea a film imagined with a real photograph of it existing today.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, silent H.264 MP4 that loops seamlessly (last frame
         hands back to the first). Silent on purpose: the party runs its own soundtrack
         (the "Аудиоряд 2050" page).
TIME:    about 97 s = about 2,900 frames. No BPM: the rhythm is 3 s slides with 0.2 s whips,
         and a 3-cuts-a-second burst opening each chapter.

LOOK
- Medium: real photographs, full-bleed, 100% of the frame, prepared at 2304 x 1296 so a
  1.00 -> 1.07 push stays sharp. One NASA Ames painting (1975) is labelled as a painting.
- Ground #030817 (the site's navy) only where no photo is (intro and outro cards). Ink #edf4ff.
  Accent ice #9dd8ff, in Martian Mono, on exactly two things: the film kicker line on each slide and the
  chapter numeral; the seed year takes it too. Nowhere else. Text in Geologica, titles in League Gothic.
  (Until release v3.0 the film was orange, #ff5315 on #0b0b0d with Inter.)
- Scrim for legibility on a projector: bottom 72% of the frame, linear gradient from
  rgba(3,8,23,0) to rgba(3,8,23,0.90). No vignette, no grain, no glow.
- Type (projector at 4-6 m): hero League Gothic, uppercase, 128 px (11.9% of height),
  line-height 0.92, tracking +0.01em, max 2 lines, max 5 words. Kicker Inter 700, 34 px,
  uppercase, tracking +0.08em. "Now" line Inter 600, 38 px, ink at 92%. Credit Inter 500,
  20 px, ink at 70%, bottom right, the only text under 34 px.
- Layout: text block anchored bottom left at x = 192 px, bottom = 120 px (inside the 80%
  title-safe box, so keystone correction never crops it). Never centred except the cards.

OBJECTS
- 26 real things: Supertree Grove, Bosco Verticale, the Lujiazui skywalk, a solar plant,
  the Shanghai Maglev, a Waymo car, the Maeslantkering barrier, Eden Project domes, an
  offshore wind farm, Sophia, Robonaut 2, a spatial headset, the Frontier supercomputer,
  a sequencing lab, a vertical farm, Ingenuity, the Artemis I launch, the ISS, Veggie,
  Perseverance, the Stanford torus painting, Saturn from Cassini, M87*, the Cosmic Cliffs,
  Orion between Earth and Moon, and Earthrise. Each shown by its own photograph, never drawn.

MOTION
- Photo inside each slide: one Ken Burns move over its 3 s, power1.inOut, alternating
  push in 1.00 -> 1.07, pull out 1.07 -> 1.00, pan left 3%, pan right 3%.
- Slide seam (whip): outgoing photo x 0 -> -14% with horizontal blur 0 -> 18 px in 6 frames
  (power3.in); incoming x +14% -> 0 with blur 18 -> 0 in 6 frames (power3.out). Direction
  alternates per chapter. Text leaves 4 frames before the seam (blur-out 0.13 s).
- Text entrance, varied: kicker whole-line blur 8 -> 0 px in 5 frames; hero per word,
  blur 6 -> 0 px and opacity 0 -> 1 in 4 frames, 2 frames apart; "now" line grey -> ink in
  6 frames. Landed text is dead still.
- Chapter card (1.2 s): numeral and word blur-swap in (5 frames), hold 0.6 s, then zoom
  through: scale 1 -> 3.2 in 0.35 s, power3.in, into the burst.
- Burst (8 cuts x 10 frames = 2.67 s): hard cuts through the chapter's own photos, each
  landing at scale 1.06 and settling to 1.00 in 10 frames (expo.out). 3 cuts a second
  maximum, no white flashes (photosensitivity, and a projector in a dark room).
- Burst -> first slide: dip cut, outgoing frame darkens 40% for 3 frames.

SHOTS
- 0.0-3.5   intro card: "2050" (League Gothic 300 px) then "The films imagined it. Here it is."
- 3.5-31    chapter 1 THE CITY: card, burst, 9 slides
- 31-55     chapter 2 THE MACHINES: card, burst, 7 slides
- 55-93     chapter 3 BEYOND: card, burst, 9 slides, Earthrise as the last slide
- 93-97     outro card: "2050 is being built now" on the ground, landing on the intro's
            first frame so the loop seam is invisible.

BANNED
- The generated-video defaults: dark void with small floating text, glow, particles, purple
  or blue gradients, glass cards, everything centred, fade-and-slide-up on every element,
  text that moves while read, corner brackets or HUD decoration.
- Crossfades between photos (worlds never crossfade). Full-white flashes.
- Text under 34 px except the photo credit. Hairlines.
- Film stills or frames from the films: the films are named, never shown.

QA
- Frames to check: 1.5 (intro readable), the first frame of each burst, the middle of each
  slide (caption readable, credit present), the last frame (matches the first).
- Every credit matches the licence on the photo's Commons page (CC BY / BY-SA need author
  and licence on screen).
