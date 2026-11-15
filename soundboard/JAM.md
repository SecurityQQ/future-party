# Jam mode: how Contact 2050 makes every touch sound good

Guests at a party touch bananas whenever they like. Left alone, that gives hits off the beat and samples in whatever key they were recorded in, and most of the Dirt-Samples library was recorded in no particular key. Jam mode (on by default; `J` toggles it) borrows the guardrails that "no wrong notes" music tools use, so whatever people touch lands in time and in tune.

## The strategies

| Strategy | Where it comes from | What Contact 2050 does |
| --- | --- | --- |
| One tempo, one key, one chord loop | Incredibox-style loop sets, where every layer is written in the same tempo and key, so any combination fits | Each kit has a `jam` block: tempo, key, scale and a four-chord loop (for example Am F C G at 124 BPM). A backing beat plays drums from Dirt-Samples plus a synth bass, pad chords and arpeggios that follow the chords. |
| Launch quantization | Ableton Live's Global Quantization, which starts clips on the next bar or beat | A touch waits for the next sixteenth note, and loops wait for the next beat. A touch that lands up to 35 ms after a grid line plays at once, because that still sounds on the beat. |
| Pitch correction to the chord | Auto-Tune with Retune Speed near 0 snaps each note to the nearest note of the chosen key and scale | When a sample loads, its pitch is measured with YIN (de Cheveigné & Kawahara, 2002) on eight windows. On every touch it is moved to the nearest note of the chord playing at that moment, cents included, by changing playback rate. Unpitched sounds (drums, noise) are left alone. |
| Scale lock with a pentatonic | Ableton Push's In Key mode drops notes outside the scale; pentatonic scales have no semitones, so nothing clashes | Melody pads walk the key's pentatonic scale with some momentum and land on a chord note whenever they fall on a beat. |
| Pads with a musical job | How producers split a song into bass, chords and lead | Each pad has a `tune` role: `root` (bass), `chord` (three notes from one sample), `strum`, `arp` (climbs the chord), `melody`, `tonic` (drone on the key) or `off`. |
| Loops in time | Warping and legato clip launch in a DAW | Loops with a `beats` count, such as the 12-beat Amen break, are stretched to the tempo and start at the point in the loop that matches the bar, so they never drift. |
| Sample-accurate timing | Chris Wilson's "A Tale of Two Clocks" | A 25 ms JavaScript timer books every sixteenth note 120 ms ahead on the Web Audio clock. If the tab sleeps, missed steps are skipped, never played in a burst. |
| A produced mix | Sidechain compression and send effects in dance music | The kick pumps the bass and chords, every touch dips the backing a little, the echo repeats on a dotted eighth, a little shared reverb puts everything in one room, and a limiter protects the speakers. |

## Round two: ideas taken from X and GitHub

A second pass looked at what live coders, toy makers and mix engineers post on X, and at the source of open-source music toys on GitHub. These are the ideas that made it in.

| Idea | Where it comes from | What Contact 2050 does |
| --- | --- | --- |
| The beat follows the room | Producers build tracks in layers and change them on phrase lines; Generative.fm pieces change over time | Every touch adds energy and silence drains it (it halves in about 17 seconds). Every four bars the beat picks a level: intro (pad and bass behind a closed filter), groove (kick and hats), full, or peak (sixteenth hats, crashes). It rises at once and falls one level per phrase. A drum fill announces each change, and a "gap" (the beat drops out for a beat) comes before the jump to peak. After 16 bars at peak there is a 4-bar breakdown: drums out, then a 2-bar build with a riser and a snare roll, and a drop with a crash. An empty room steps down and stops. |
| Hooks, not coin tosses | Strudel's random-but-repeating patterns (randomness as a function of time) | Each melody pad has its own seeded two-bar motif on the pentatonic scale. A touch plays the motif note for the sixteenth it lands on, so tapping the same rhythm plays the same tune every two bars. |
| Contour keys | Piano Genie (Chris Donahue, Google Magenta): 8 buttons play an 88-key piano, and its makers point out it works with a Makey Makey | In kit 8 the six back pins are one horn section. A pin to the right of the last one goes up, one to the left goes down, the same pin repeats, and the jump grows with the distance. It is a rule, not a trained model: notes come from the pentatonic scale and beats land on chord tones that keep the direction. Each note is played from the horn sample recorded nearest to it, as a multisampled instrument does (Tone.js Sampler), so nothing is stretched more than about 4 semitones. |
| Auto-harmony | Blob Opera: "transform your musical ideas (no matter how good or bad) into beautiful harmonies" | At full and peak, melody and contour notes get a softer second voice: the chord tone below, or two pentatonic steps below a passing note. |
| Groove and accents | Swing in Tone.js and Strudel; drummers' accents | Grooves can swing (hip-hop 0.18 of a sixteenth, halftime 0.12, pop 0.08, house 0.06), and snapped touches follow the same swing. Drum hits vary slightly in level (hats ±12%, the rest ±4%). Touches on the beat play louder than off-beat eighths, which play louder than sixteenths. |
| Voice-led chords and a walking bass | tonal's voicing picker (smallest move to the next chord) and Strudel's anchored voicings | The pad picks the inversion that moves least from the last chord while staying around middle C. At full level, a short bass note before a chord change steps to the next root from the scale. |
| One note per grid slot | Mashing-proofing | Hitting the same pad several times inside one sixteenth plays one note, not a stack. |
| Cleaner effects | Mix engineers on X: filter the reverb return, use a tempo-synced pre-delay, duck the reverb from the dry hits. reverbGen (as used in Strudel) | The reverb impulse darkens as it fades (a low-pass sweeping from 15 kHz to 1 kHz). The reverb has a 32nd-note pre-delay and its return is cut below 220 Hz and above 9 kHz. The echo loses its lows on every repeat. Reverb and echo dip about 6 dB under every touch and recover within 300 ms, so tails swell in the gaps. |
| Attract mode | Generative.fm's "eno machine": a few notes, each on its own slow loop, that never line up | When the empty room has stopped the beat, the notes of the kit's first chord and its ninth ring softly, each on a loop of 20 to 60 seconds, for up to eight minutes. The next touch fades them out. |
| Visuals from the score | Felix Turner: "the code generates the notes, so it knows where to draw them"; Patatap; Hydra-style feedback | The scheduler cues every kick, snare, crash, chord change and drop, and a frame draws each one when it reaches the speakers. The picture is a quiet night sky. Each pin has its own animation in thin lines and points (a comet, meteors, orbits, a star bursting, a galaxy, a constellation, a radio signal, a pulsar, a field of lights, an aurora). The rim of a planet low on the screen and a faint nebula take the colour of the chord's root: its place on the circle of fifths, folded onto the cool half of the colour wheel, so related chords look related and the sky stays blue to violet. The kick brightens the rim, the stars drift faster as the room gets busier and go to warp on a drop, and stage mode puts the spectrum round an eclipse. A feedback layer redraws the animations slightly zoomed every frame, and the FX pad's echo and reverb lengthen the trails. Reduced-motion settings stop the stars, shake, trails and sparks. |

Considered and left out:
- **Butterchurn (MilkDrop in WebGL):** 192 KB minified, needs WebGL2, and compiles presets with `new Function`. A strict page policy would block it.
- **Magenta's Piano Genie model:** `@magenta/music` alone is about 12 MB before checkpoints.
- **Strudel and Hydra code:** both are AGPL, so only their ideas are used, never their code.

## Measured in Chrome

These numbers come from a test that drives the built page and presses pins at random.

- **Pitch detection:** 70 of 74 samples whose note is in the file name (Moog, bass pluck, muted horn, sax) come out on the right note. The misses are three bass notes below 50 Hz and one sample a semitone off.
- **Timing:** 100% of hits in Liftoff and Rave 2050 start on the sixteenth-note grid (within the 35 ms grace). Jam Session reads 84%, because strums spread their notes 35 ms apart on purpose.
- **Notes:** every auto-tuned note in Liftoff and Rave 2050 landed on a note of the chord playing at that moment. In Jam Session the rest were pentatonic passing notes between beats.
- **Key:** with Jam Session moved to B major, where its raw samples clash, 94% of the pitched energy of random playing was inside the key with jam on, against 8% with jam off.
- **After round two:** in Jam Session, all 63 pitched notes (harmony voices included) were chord or pentatonic notes.
- **Arrangement**, tested in Rave 2050 at 180 BPM:
  - One touch gives one phrase of groove, then the intro.
  - A touch every 0.4 s reached full at the next phrase line, 3 bars in, and peak 4 bars later.
  - After 16 bars at peak came the breakdown, a 2-bar riser and a drop with a crash.
  - Once the room emptied, the beat stepped down a level per phrase, stopped and handed over to the chimes.
- **Contour keys:** the row W to G played 57, 62, 67, 72, 77, 81 (MIDI), all in key. The reverse played the mirror, and repeating one pin repeated its note.
- **Hooks:** the same rhythm in two consecutive two-bar cycles played the same five-note tune.
- **Harmony:** one voice at groove level. At full there were two: the second 3 semitones lower and at 42% of the level.
- **Visuals:** a steady 60 fps (16.7 ms median, 16.8 ms 95th percentile between frames) in stage mode with a pin pressed every 120 ms, in Chrome on a Mac, on a normal screen and on a 2× retina screen.

## Limits

- **Live vocals are not auto-tuned.** A microphone auto-tune needs real-time pitch shifting (PSOLA or a phase vocoder in an AudioWorklet), and the hosted copy of the page cannot use the microphone. The pad-level correction here moves whole samples.
- **The robot announcer stays as it is.** It speaks with the computer's speech voices, which cannot be routed through Web Audio.
- **Chord samples move by their root.** A minor stab over a major chord keeps its minor third. Rave 2050 avoids that by using only minor chords.
- **The level is a guess about the room.** It counts touches, not people. One guest drumming fast fills the room's energy as much as a crowd does.
- **Some sounds can't be tuned.** Sweeps, inharmonic bells and speech that wanders get only a loose pitch estimate. Plain `auto` pads leave them alone; pads with an explicit role use the median pitch.

## Changing the music

Everything lives in `kits.json`; run `python3 -I build.py` afterwards. The build checks every field.

- `grooves`: drum samples, sixteen-step patterns (`x` hit, `o` soft hit, `.` rest), plus `bass`, `pad` and `arp` layers, `pump` for the sidechain, `swing` (a fraction of a sixteenth, up to 1/3) and `crash` (the sample for phrase crashes and drops). Drum parts named `kick` and `hat` play from the groove level; other parts join at full. The fill uses `snare`, or `clap` if there is no snare.
- `kits[].jam`: `bpm` (60 to 180), `key`, `scale` (`major`, `minor`, `dorian`, `mixolydian`), `chords` (names such as `Am`, `F`, `Cm7`, `Abmaj7`, `Bbsus2`), `bars` per chord, and `groove`.
- Pads: `tune` (role, default `auto`; `contour` makes the pad one key of a row, ordered as the pins are listed in `inputs`), `low` (lowest note of a contour row, MIDI, default 57), `q` (quantize in beats; `0` plays at once), `beats` (loop length, for tempo sync), `len` (cut the note after this many beats), `mono` (a new note cuts the last).

In the page, **Key** transposes the whole kit, **Tempo** keeps the bar position while it changes, and each pad's role can be changed in its editor under *In jam mode*.

## Sources

- [Ableton Live manual: Launching Clips](https://www.ableton.com/en/live-manual/12/launching-clips) (global and clip launch quantization, legato)
- [Antares: Pitch correction, the complete guide](https://antarestech.com/blog/pitch-correction-the-complete-guide-to-tuning-vocals) and [Creating the Auto-Tune effect](https://www.antarestech.com/blog/auto-tune-effect-using-auto-tune) (retune speed, key and scale)
- [de Cheveigné & Kawahara, YIN, a fundamental frequency estimator for speech and music, JASA 111(4), 2002](https://cagnazzo.wp.imt.fr/files/2013/05/2002_JASA_YIN.pdf)
- [Chris Wilson, A tale of two clocks](https://web.dev/articles/audio-scheduling) (lookahead scheduling in Web Audio)
- [MusicRadar: composing with Ableton Push](https://musicradar.com/tuition/tech/how-to-compose-melodies-and-chords-with-ableton-push-629127) and [Melodics: Push in key mode](https://support.melodics.com/en/articles/6798079-connecting-your-ableton-push-to-melodics-keys-lessons) (In Key scale mode)
- [Ethan Hein: Identifying pentatonic scales](https://ethanhein.substack.com/p/identifying-pentatonic-scales) and [8notes: improvising with the pentatonic scale](https://8notes.com/school/lessons/piano/improvising-on-the-piano-with-the-pentatonic-scale.asp) (why pentatonics have no clashing notes)
- [Incredibox on Wikipedia](https://en.wikipedia.org/wiki/Incredibox) and the [Incredibox modding docs](https://www.incredibox.com/mod/doc). The developers haven't published how their loops are written; same tempo and key is the evident design.
- Round two, from X:
  - Piano Genie: [Chris Donahue](https://x.com/chrisdonahuey/status/1051868153700016128), [Monica Dinculescu on Fruit Genie and Makey Makey](https://x.com/notwaldorf/status/1144683401720418304), [Makey Makey](https://x.com/makeymakey/status/1404471980305309697)
  - [Blob Opera](https://x.com/Google/status/1341821720597061633)
  - [Felix Turner on drawing from the notes](https://x.com/felixturner/status/2039144776424145246)
  - Mix tips: [reverb ducking](https://x.com/natemixing/status/2113691948720480454), [pre-delay](https://x.com/natemixing/status/1937163740731920762), [filtering returns](https://x.com/natemixing/status/2108618497915847040), [Jono Grant on effect returns](https://x.com/jonogrant/status/1201927830751174656)
  - Visuals and generative music: [feedback visuals](https://x.com/moistpeace/status/1765875575569158417), [Patatap](https://x.com/jonofyi/status/1375492745746259979), [Generative.fm](https://x.com/alex_bainter/status/1140376345211539456)
- Round two, from GitHub:
  - [Strudel](https://codeberg.org/uzu/strudel): random-but-repeating patterns, anchored voicings, swing, and reverbGen. AGPL, so only the ideas are used.
  - [Tone.js](https://github.com/Tonejs/Tone.js): swing and the Sampler's nearest-sample playback.
  - [tonal](https://github.com/tonaljs/tonal): voice leading.
  - [Generative.fm generators](https://github.com/generativefm/generators): the eno machine.
  - [Patatap](https://github.com/jonobr1/Patatap): an animation per key.
  - [butterchurn](https://github.com/jberg/butterchurn): considered, not used.
