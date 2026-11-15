# Six Facts: review (2026-11-14)

**The calls made without asking** (the brief was five lines, so these are the ones to overrule first):

- **"Epic video fragments" are NASA footage, not film scenes.** The Artemis I and Saturn V launches, the Sun
  from SDO, Earth and Hurricane Milton from the ISS, Greenland from the air, the Black Marble night lights and
  NASA's carbon dioxide simulation. `reel/brief.json` had already ruled out downloading clips of the 18 films,
  and public-domain footage keeps this film publishable beside the others. A private cut with film scenes is
  a different film: STORYLINES.md does not cover it.
- **The six facts are the spine.** Each chapter is a fact, a book quote, a post from X and two slides from
  *Further*, eight bars long. 13 of the 16 *Further* slides are used; "People living on the Moon", "Airships
  over Venus" and "Life in an alien ocean" are left out.
- **The facts are shortened** from the book page to 13 to 21 words so they can be read in two bars. Nothing
  was added; the numbers and sources are the page's. Fact 2 drops the scenario names (BAU2, Comprehensive
  Technology), fact 5 says "his novel" where the page names *The Ministry for the Future*, and fact 6 drops
  the sentence about how authority is scored.
- **Four quotes and four posts are excerpts**, marked with an ellipsis where they start or stop mid-sentence.
  The build checks every one word for word against `books/quotes.json` and `tweets/tweets.json`.
- **It has music**, unlike the wall films: "Call to Adventure" by Kevin MacLeod (CC BY 4.0, credited on the end
  card). It was chosen by measurement: 4 minutes long, a steady 86 BPM, a build that peaks where chapter 6 sits.
  **Nobody has heard this mix.** For a silent copy: `ffmpeg -i renders/six-facts-2050-1080p.mp4 -an -c:v copy silent.mp4`.

**The two storylines not built** are in STORYLINES.md: one ruler of years from 1972 to 2050 that the camera
travels along, and a "who said it?" guessing game for the wall.

**Check.** `npm run check`: 0 errors, 81 of 81 contrast samples pass. Warning kept on purpose: `line_unread`
on the two lines of the end card ("on screen under 2 s"). The checker lost one sample of the card near 148 s
(it reads opacity `null` for a single sample between samples that read 1). The card is on screen for 6 s; the
rendered file was compared frame by frame from 144 s to the end and no frame differs from the next by more
than the line's own entrance.

**Fixed before the final render.**

- A scrim over the bottom 86% of the frame hid the footage. It now covers the left two thirds, so the right
  and top of every shot stay clean.
- The opening shot started in the dark. It now starts with the launch already on the horizon, and the title is
  on screen at frame 0.
- The Sun clip under the first quote had a black frame every 12 frames (gaps in the source). It now uses a
  clean stretch of the same film. Every fetched clip was scanned for one-frame dips and hidden cuts.
- The night-lights globe rendered almost black (mean brightness 1 to 4 of 255). It is lifted with one curve.
- The ISS film carries a 34 px black bar top and bottom; every shot from it is cropped to 93.6%.
- Pushes between shots left a strip of empty ground between the two shots. Both shots now travel together.
- The first render had one empty frame at 1:46, where a clip started 0.03 ms after the frame it belonged to.
  Every scene now starts a quarter of a frame early, so no clip can miss its frame.
- The fact sentences came in 0.12 s earlier after the checker measured one of them 0.07 s short of its
  reading time.
- Inter turned "24x7" into "24×7" in a post. Contextual alternates are off for posts.

**Measured on the rendered file** (`renders/six-facts-2050-1080p.mp4`):

- 1920×1080, 30 fps, 149.5 s (4,485 frames), H.264 and AAC, 175 MB. Rendered three times; this is the third.
- Every frame was compared with its neighbours: no empty, black or repeated frame, and all 50 hard cuts fall
  within 4 frames of a bar of the score (the pushes straddle their bar on purpose).
- Sound: -15.8 LUFS integrated, true peak -1.1 dBTP, no clipping. Each impact sits 2 to 4 dB over the bar
  that follows it. The second render had them 10 to 20 dB over the quiet opening, so each impact is now set
  against the music it lands on.
- Frames read from the MP4: the title at 0.0 s, every fact, quote, post and slide at its middle, both sides
  of a zoom cut, a dip cut, a push and a chapter cut, the last slide at 139.6 s and the end card at 148.5 s.
- The 720p preview (`video/dist/media/six-facts-720p.mp4`, 21 MB) was encoded from this file.

**Not checked.** The sound was measured, not heard: whether the score suits the room, and whether the impacts
and whooshes sit well against it, needs ears. Nobody has watched it on the projector.

**The weakest part.** Chapter 4. The carbon dioxide simulation is the only footage that is a diagram and not
a place, and it sits under the fact about educating girls, which the picture does not show. With more time:
real footage of a classroom from a source that is free to reuse.

**Rebuild.** `python3 -I tools/fetch_footage.py`, `python3 -I tools/prepare_assets.py`,
`python3 -I tools/build.py`, then `npm run check` and `npm run render`.
