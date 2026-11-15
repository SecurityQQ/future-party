# Play 2050

A Makey Makey soundboard for Future Party 2050. It was called Contact 2050 until November 2026; the built file keeps the old name, `dist/contact2050.html`. There are twelve pins, eight kits and 2,038 sounds from TidalCycles' [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) library. Jam mode keeps every touch in time and in key, and stage mode is for the projector. It is one HTML page with nothing to install.

It is part of [Future Party 2050](../README.md), and it is online at [future-party-2050.vercel.app/soundboard](https://future-party-2050.vercel.app/soundboard), listed on the party's front page.

## Play

1. Open `dist/contact2050.html` in Chrome, or the [online copy](https://future-party-2050.vercel.app/soundboard).
2. Plug in the Makey Makey. It shows up as a keyboard and a mouse.
3. Hold the EARTH clip and touch a pin.
4. Press Enter for stage mode on the projector.

The **Setup** button in the page has the wiring guide, the pin map and party ideas. A keyboard works too: arrows, Space and W A S D F G, with digits 1 to 8 to change kit. "Future Party 2050" at the top opens the party's front page in a new tab.

| Kit | Pads |
| --- | --- |
| 1 Liftoff | air horn, sub drop, laser sword, UFO, "Are you ready", hoover, warp drive, riser, robot fart |
| 2 Robot Choir | a speaking announcer, countdown, Speak & Spell, alphabet, diphone and toy-robot voices |
| 3 Rave 2050 | kick, clap, hat, snare, a hold-to-loop Amen break, stabs, 808, gabba, sub glide |
| 4 Alien Zoo | crow, bark, insects, sheep, monster laugh, wolfman, birds, bubbles |
| 5 Arcade Attack | lasers, explosions, 1-up, torpedo, coins, chopper, thrusters |
| 6 Deep Space | looping pads and drones, bells, dub siren, Moog, teleport |
| 7 Jam Session | built for playing music: Moog lead, bass, chords, arpeggio, strum, bells, a robot singer, drums and a riser that drops on the bar |
| 8 Magic Keys | the back row W A S D F G is one horn section you can't play wrong (right goes up, left goes down), with sax, bass, chords, harp and strum |

CLICK is a Chaos pad in every kit: each hit plays a random sound from the whole library. Every pad can be swapped for any Dirt-Samples sound, and every pin remapped, from the page itself. Edits are saved in the browser.

## Jam mode

Jam mode is on by default; `J` toggles it. It makes whatever guests touch sound like music:
- **Tempo, key and chords.** Each kit has its own tempo, key, four-chord loop and backing beat.
- **Timing.** Touches snap to the next sixteenth note.
- **Tuning.** Every sample's pitch is measured when it loads and auto-tuned onto the chord that is playing.
- **Hooks.** Melody pads play repeating hooks on a pentatonic scale.
- **Loops.** Loops are stretched to the tempo and locked to the bar.
- **The beat follows the room.** More touching builds it from intro to peak, with fills, crashes, breakdowns and drops. When the room goes quiet the beat winds down to soft chimes.

[`JAM.md`](JAM.md) explains each technique, where it comes from, what was measured and what it can't do.

## The look

Space, kept minimal:
- **The page** is a black sky, Inter in two weights, hairlines instead of boxes, and colour only where something is happening.
- **The sky behind the board** follows the music:
  - each pin draws its own animation in thin lines and points (a comet, meteors, orbits, a constellation, a pulsar, an aurora…);
  - a planet's rim and a faint nebula take the colour of the chord, and the kick brightens the rim;
  - the stars drift faster as the room gets busier and go to warp on a drop.
- **Stage mode** puts the sound's spectrum round an eclipse in the middle of the screen.

Two components were borrowed from and rewritten in plain CSS:
- **A "shiny button".** Its conic-gradient border runs round the main buttons, the active kit and any pad that is sounding.
- **Louis Studios' Warp Carousel.** The card that turns in when you change kits takes its mesh gradient, thin numeral and two-line title from it.

## Build

```bash
python3 -I build.py             # writes dist/contact2050.html, which streams sounds from the jsDelivr CDN
python3 -I build.py --offline   # also writes dist/contact2050-offline.html (about 10 MB, needs ffmpeg) with the
                                # kit sounds and about 290 Chaos sounds built in, for a venue without wifi
```

| File | What it is |
| --- | --- |
| `kits.json` | The kits, one pad per Makey Makey pin, each with its jam block: tempo, key, chords, groove, swing and crash. |
| `template.html` | The page: styles, markup and all the code, audio engine, jam mode and visuals included. |
| `build.py` | Checks `kits.json` and the library, then injects both into the template. |
| `dirt-samples.json` | The library: every sound with its length and loudness. `tools/manifest.py` regenerates it from a Dirt-Samples checkout. |
| `JAM.md` | How jam mode works, with sources and measurements. |
| `dist/contact2050.html` | The built page. |

## Sounds and licence

Dirt-Samples is pinned to commit `c74fc80`. It has no licence file, so its audio is streamed rather than committed here. The offline copy is built locally and git-ignored, along with the download cache in `.cache/`. The air horn, riser, dub siren and teleport are synthesized in the browser. The announcer speaks with the computer's own voices.
