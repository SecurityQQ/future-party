# The Roast: brief

**Goal.** A 63-second film that tells how the wall film went from *Already Here* (v1) to *Further* (v2). It roasts the worst v1 slides as exhibits, stamps them CUT, then reveals the recut. For the party wall between loops and for sharing with co-hosts. 1920×1080, 30 fps, bundled Pixabay sound effects (no attribution needed), no music.

**Look.** The v1 and v2 films' own look: ground #0b0b0d, one accent #ff5315, League Gothic for display, Inter for text. The real frames from both renders are the pictures, captions included, so guests see exactly what played.

**Story, by frame (30 fps).**

| Scene | Frames | What happens |
|---|---|---|
| open | 0–141 | "THE ROAST" title already on screen at frame 0 (the thumbnail), out at 1.0 s; then "We made a film about 2050." and "Then we watched it." Word blur-in at 0.067 s per word. |
| roast | 141–933 | 11 exhibits × 72 frames. Hard cut in, image scale 1.05→1 over 0.3 s (expo.out), then a slow push. Roast line at +0.35 s. Stamp at +1.1 s: scale 2.4→1, rotation −14°→−8° over 0.14 s (power4.in), frame shake x −14→0 (elastic) and a bass impact. Ten CUT stamps (accent), the last one KEEP (white). |
| score | 933–1038 | Four tallies: 15 cut, 6 demoted, 3 replaced, 1 kept. One every 0.4 s with a soft click. |
| turn | 1038–1143 | "The future isn't what already exists." then "It's what's next." Riser under both lines. "FURTHER" lands at 2.6 s and zooms through (scale 1→6, 0.35 s, power3.in) on a cinematic whoosh. |
| recut | 1143–1761 | 8 v2 slides × 66 frames, then Saturn 90 frames. Alternating 0.2 s whip (xPercent ±100, horizontal blur 40 px) and zoom-through (1.3→1 with 16 px blur), soft whoosh on each. |
| end | 1761–1881 | "FURTHER", "Projection 2050 · the wall film, recut", the stats, then "Which one will you build?" |

**Banned.** White flashes, more than 3 cuts per second, music under the stamps, text outside the 80% title-safe box, CSS filters on the photos.

**QA.** `npm run check` with 0 errors. Snapshot every exhibit at its stamp and every recut slide. Render, then check frames from the MP4 itself.
