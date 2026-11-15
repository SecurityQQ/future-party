# Mirror 2050

A live camera mirror for the party: eight effects that went viral on X, rebuilt for the browser and driven by your hands. One HTML file. WebGL2 shaders draw the effects, and [MediaPipe Tasks](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) tracks hands (21 points each) and the body outline. Camera frames stay on the computer.

## Start it

```bash
python3 -m http.server 8050 -d mirror     # from the repo root
open http://localhost:8050                # Chrome or Edge work best
```

The camera only starts on `http://localhost` or `https`. Opening the file from disk also works in Chrome while online, because it then loads MediaPipe from the CDN.

**Offline (the projector laptop):** run `mirror/tools/vendor.sh` once while online. It puts MediaPipe and both models (26 MB) in `mirror/vendor/`, which is not committed. When the page is served over http and those files exist, it uses them; otherwise it uses the CDN. Without either, every effect still runs, only without hand and body tracking.

| Address | What it does |
| --- | --- |
| `?party` | Starts the camera at once, hides the controls, changes effect every 25 seconds. For the projector. |
| `?fx=portal` | Opens on one effect: `liquid`, `swarm`, `holo`, `portal`, `shatter`, `time`, `matrix`, `cloak`. |
| `?src=clip.mp4` | Plays a video file (same origin) instead of the camera, for demos and tests. |
| `?hud=0` | Starts with the hand HUD off. |
| `?mirror=0` | Does not mirror the image (rear camera, or a camera behind the guests). |
| `?hands=0` | Skips hand tracking. `?delegate=cpu` runs MediaPipe on the CPU. |

**Keys:** `1`–`8` effects · `←` `→` previous and next · `H` hand HUD · `A` party mode · `S` snapshot (PNG) · `C` next camera · `M` mirror · `B` relearn the room (Cloak) · `F` fullscreen · `I` sources · `Space` hide the controls. Click and drag works as a stand-in hand in Liquid Air, Neon Swarm, Portal, Shatter, Time Warp and Matrix.

## The effects and where they come from

Found on X on 14 November 2026. Likes and views are from that day.

| # | Effect | How to use it | After |
| --- | --- | --- | --- |
| 1 | **Liquid Air** | Move your hands: they become glass with rainbow edges and the air ripples. | [@xbh_artist, “what if air had a surface”](https://x.com/xbh_artist/status/2057426589932236948): 9.3k likes, 2.6M views |
| 2 | **Neon Swarm** | 12,000 particles. 1–4 fingers write HELLO, 2050, FUTURE, PARTY; a fingertip scatters them; open palm makes a nebula; a fist catches an orb. | [@V7700SN, “three.js + mediapipe = Absolute Cinema”](https://x.com/V7700SN/status/2009923828932313461): 8.6k likes, 607k views |
| 3 | **Holo Cube** | You become a hologram. Both hands hold a glitching cube: midpoint moves it, distance scales it, angle turns it, pinches distort and recolour it, fast moves glitch it. | [The TouchDesigner “glitchy cube”](https://x.com/BayardXBT/status/2064384972857737505): 280k views |
| 4 | **Portal** | Open palm opens a portal to a hyperspace tunnel. Pinch with both hands and pull apart to tear a window into a synthwave 2050. | [@xbh_artist, “hid the ocean inside reality”](https://x.com/xbh_artist/status/2058066555892826284): 1k likes, 59k views |
| 5 | **Shatter** | The picture splits into glass panels that fly apart from your open hand and snap back on a fist. | [@berto_bau, MediaPipe panels](https://x.com/berto_bau/status/2028577952154165474): 1.8k likes, 174k views |
| 6 | **Time Warp** | Slit-scan: lower rows show older frames. Point a finger and time ripples out from it; a fist freezes time. | Slit-scan, the [2001: A Space Odyssey Stargate](https://x.com/StanleyKubrick/status/1907461761504346601) trick and the TikTok time-warp scan |
| 7 | **Matrix** | You are drawn in falling glyphs; your hands are lenses that show the real colours. | [@jh3yy, “ASCII Webcam?”](https://x.com/jh3yy/status/1832147365714915779): 3.7k likes, 220k views |
| 8 | **Cloak** | Active camouflage: your body shows the room behind you, with a shimmering edge. A fist decloaks. Step out of frame once so it learns the room; it fills in the rest from the edges. | The OpenCV [invisibility cloak](https://x.com/erRaghavKhanna/status/1285504929700777985) and [@youtoy’s MediaPipe cloak](https://x.com/youtoy/status/1558731638783492099) |

The hand HUD (on by default) draws the skeleton, fingertip reticles, a rotating palm ring, finger count, pinch distance in millimetres, and the span between two hands. It is styled after the “Jarvis” hand-tracking interfaces on X.

Also viral, not rebuilt here: chrome silk rigged to the hands in TouchDesigner ([3.0M views](https://x.com/defileo/status/2050261337906016505)), projector balls bouncing off sticky notes ([874k](https://x.com/anulagarwal/status/2037765879589679385)), gum-gum face stretch ([417k](https://x.com/ErenChenAI/status/2066548785090576857)), a head-tracked “window” into a Gaussian splat ([199k](https://x.com/willeastcott/status/2085729138904608785)).

## How it works

- `index.html` holds everything: the UI, one fragment shader per effect, a small WebGL2 helper, the hand logic and the HUD.
- Hands: MediaPipe `HandLandmarker` (GPU, CPU as fallback), two hands. Each hand gets a smoothed skeleton, finger count (stable over 4 frames), openness, pinch, palm centre, size and speed. These go to every shader as uniforms.
- Body: MediaPipe `selfie_segmenter` runs only for Holo Cube and Cloak, on a 256-pixel copy of the frame.
- State on the GPU: Liquid Air runs a wave equation in a half-float texture (two steps per frame). Time Warp keeps 90 frames in a texture array. Cloak keeps a picture of the empty room and fills unseen parts from their neighbours. Neon Swarm moves its particles on the CPU and draws them as additive points.
- If the frame rate stays under 34 fps for 3 seconds, the render resolution steps down (to 60% at most); the FPS pill shows it.
- Tested in headless Chrome 157 with a fake camera fed from the viral clips: all eight effects at 60 fps, hands in about 11 ms per frame, also with tracking off and from `vendor/`.
