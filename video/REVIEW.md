# Review: Already Here (pass 3, 2026-11-13)

Checked with `hyperframes check` (0 errors) and snapshot sheets in `snapshots/` (pass1, pass2, pass3, review).

Fixed after review
- Whip seams showed half a black frame: every slide's black background hid the outgoing photo. Slides are transparent now, so the whip reads as one smear (10.30-10.43 s).
- The orange film line was weak over bright skies (Supertrees, torus). The scrim now covers 72% of the frame and reaches 0.9 black, and caption text has a soft shadow.
- The intro and chapter zoom stopped at about 2x and left 3 empty frames at the cut. It now reaches 6x, so the letters fill the frame at the cut, and the card text starts on the next frame.
- Saturn and M87* sit higher so the caption clears them.

Accepted warnings
- film_silent: silent on purpose, because the party runs its own soundtrack.
- timeline_track_too_dense and duplicate_media_discovery_risk: generated chapter files hold 7-10 slides each; this is not a render problem.

Loop seam: the last frame (94.73 s) and the first frame (0 s) are the same "2050" card, so a looping player shows no jump.
Photosensitivity: chapter bursts cut 3 times a second at most, with no white flashes.

## v2 "Further" (2026-11-14)

- Roast of v1 in `ROAST.md`: 15 of 25 slides cut, 6 kept only as burst frames, 3 replaced, 1 promoted (the 1975 torus).
- New cut: 16 claims (2030–2050) in three chapters (The planet / Orbit / Beyond). Each slide reads "By <year> · <film>" / claim / "<seed year> <seed fact>". Seeds and links are in `tools/page.py` (SOURCES).
- Images: 37, all PD, CC0 or CC, from Commons (`assets/picks-v2.json`, candidates in `assets/candidates-v2*.json`, contact sheets `snapshots/sheet-v2*`). Burst frames now carry an on-screen credit too.
- Transitions alternate a zoom-through (scale 1.3→1 plus blur) and the whip, instead of 22 whips in a row. Slides hold 3.5 s.
- Bright frames (Venus, the mammoth plain, Starship) use `"scrim": "strong"` to keep the orange kicker above 3:1.
- Check: ok, 0 errors. Warnings accepted: film_silent (intentional), timeline_track_too_dense.
- Render: `renders/further-2050-1080p.mp4`, 1920×1080, 30 fps, 2238 frames, 74.6 s, H.264, 12.7 Mbps, 118 MB. Loop seam: first and last frames match at 63.8 dB PSNR.
- Page: `python3 -I tools/page.py --frames` writes `dist/further-2050.html`, published at https://claude.ai/artifact/8zQjJUnHQXxsWWD1aQKYnx.
- v1 can be rebuilt: copy `slides_v1.json` over `slides.json` and run `python3 -I tools/build_v1.py`. `renders/already-here-2050-1080p.mp4` is untouched.
