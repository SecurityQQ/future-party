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
