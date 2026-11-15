# The Roast: review (2026-11-14)

- Check: ok, 0 errors. Warning accepted: timeline_track_too_dense (11 exhibits and 9 recut slides on one lane each, same as the wall film).
- Fixed before render: frame 0 was black (the thumbnail on players), so the film now opens on a "THE ROAST" title already on screen. Overlapping sounds on one track were split by kind (impacts, chime, clicks, riser, whooshes). Stamps were mixed case, now uppercase.
- Sound: bundled Pixabay effects, no attribution needed. The first mix measured -8.3 LUFS because the bass impacts sat near full scale. They were cut about 11 dB. The final mix is -20.4 LUFS integrated with a -6.7 dBFS peak.
- The tally was corrected to 15 cut, 6 demoted, 3 replaced, 1 kept, counted from `video/ROAST.md`.
- Render: `renders/the-roast-2050-1080p.mp4`, 1920×1080, 30 fps, 62.7 s, H.264 and AAC, about 48 MB. Frames checked from the MP4 at the title, an exhibit stamp, the KEEP stamp, the score, the "Further" title and a recut slide.
- Rebuild: `python3 -I tools/build.py`, then `npm run check` and `npm run render`. Frames in `assets/v1` and `assets/v2` were taken from the two wall-film renders.
