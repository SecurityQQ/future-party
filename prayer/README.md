# Prayer Room

A joke shrine for the party, made for phones: **vargafutureparty.com/pray**.

An icon of Elon Musk in the manner of a Byzantine icon, made of the party's own materials (deep navy, liquid chrome,
ice blue), stands in the middle of the screen and moves slowly, like oil on water. A guest can:

- **Pray**: write what they ask of 2050 and send it. The words rise to the halo, a rocket leaves the icon's hand, and a
  **verse** comes back: one of Elon Musk's four real posts that name 2050, with its date and a link to the post.
- **Light a candle**: it stands on the icon's lower edge and stays lit on that phone.
- **Touch the icon**: a ripple goes through the picture.
- **Full screen** (the corners button at the top right, or the F key): the icon alone, as large as the screen allows,
  with no title, panel, candles or verse. Where the browser has a full screen (computers, Android, iPad) it takes the
  whole screen; on an iPhone the page only clears everything away. A tap or a moved mouse brings back the button for
  a moment (the tap that shows it does not press it); Esc or F also leave. Works with `?wall` too.

Every prayer, candle and touch raises the room's "devotion" for about half a minute: the colour moves more and the
drone opens up. Nothing a guest writes leaves the phone; candles and the count of prayers are kept in the browser's
local storage (`fp2050-prayer`).

## Addresses

| Address | What it does |
| --- | --- |
| `/pray` | forwards to `/prayer/index.html` |
| `?wall` | for a big screen: no controls, the icon alone, the verses turn every 18 seconds, and a line tells guests the address |
| `?go` | skips the door and opens the room silent (the preview picture is taken with `?wall&go`) |

## How it is made

One file, `index.html`, no build.

- `icon.jpg` (1152×2048) is drawn by a WebGL shader. Only the blue parts of the picture flow and change colour, between
  ice and violet; the face, the hands, the rocket and the chrome frame are masked and stay as painted. Two glints go
  round the halo. Outside the picture the shader continues the aureole into the dark, with stars.
- A 2D canvas above it draws the sparks and the rocket. Candles are CSS.
- The sound is Web Audio: an open chord on D as a drone through a low-pass filter that opens with devotion, and a bell
  for each prayer. "Enter without sound" starts none of it.
- Without WebGL, or opened from the folder as a file, the icon is a still picture that only breathes.
- Reduced motion: a still icon, no ripples, sparks or rising words; the verse appears at once.
- The motion is slow and nothing flashes.

## The picture and the words

- **The icon is an AI-made picture** (GPT Image 2.6 through [varg](https://varg.ai), November 2026), not a photograph
  and not a work by or for Elon Musk. The page says so on its door and under the controls. It is a party joke; nobody
  shown or quoted has anything to do with the party.
- **The verses are real posts**, quoted word for word, three of them as the whole sentence that names 2050 out of a
  longer post. They are the four posts by @elonmusk in `tweets/tweets.json`, which keeps their full text and context;
  the list lives in `VERSES` at the top of the script. Nothing else on the page is put in his mouth: the lines above a
  verse ("Your prayer is in orbit") are the room's own.

## Changing it

- Another verse: add it to `VERSES` (text, date, post id), and to `tweets/tweets.json` if it is new to the site.
- Another icon: replace `icon.jpg`, keep 9:16, then move the masks in the shader (the ellipses for the face, hands and
  rocket, and `HALO` / `ROCKET` in the script) to where they are in the new picture.
- After a change to the look, retake `preview.jpg` (1280×720, a screenshot of `?wall&go`), then run
  `python3 -I hub/build.py`.
