# The Future 2050

The party app for Varga Future Party 2050: **https://vargafutureparty.com/app**, on the party's own site. One Vercel project, `the-future-2050` (root directory `app/`), serves the app under `/app` and the party site everywhere else (the static pages `npm run site` builds from the repo into `public/`).

Passes written with the first address, `zodiac-rangers.vercel.app/t/<code>`, keep working: that address and the-future-2050.vercel.app still belong to the project. A phone without a traveler is sent from them to vargafutureparty.com; a phone that already has one stays on its address, where its session cookie is. The app's old paths (`/t/<code>`, `/c/<n>`, `/me`, `/login`, `/scan`, `/leaderboard`) redirect to `/app/...` (`next.config.ts`).

**Files.** Pages are in `app/app/` (the `/app` segment); the API stays at `app/api/` (`/api`). The app's own static files are in `public/app/` (`/app/img`, `/app/vibes`, `/app/mirror`); everything else in `public/` is the party site, git-ignored and rewritten by every build.

**The story.** It is 2050, and nobody arrives alone. Every traveler is met by their Kin: a companion from the future, shaped by the sky they were born under and the life they lead. Three oracles at Arrival Station read your sky while your Kin crosses over. Then you tap the pass of everyone you meet, and their Kin joins your orbit. The future is who you meet.

**Frozen since 25 November 2026.** The party is over, and the app is its archive, with no database. Every traveler, orbit, pass and signed-in phone is in `lib/frozen.json`; every Kin picture is in `public/app/kin/`; the clips stay on varg's CDN. The Supabase project can stay paused. See [The archive](#the-archive).

**The words.** traveler (a guest), pass (the NFC card), Kin (the companion creature), orbit (the Kin you collected), oracles (Vexa, Grumm, Ilu), Arrival Station (the home page). The code keeps the old identifiers (`hold`, `pilot`, `astrologers`).

A guest taps their pass (an RFID/NFC tag) on their phone. The page asks for their name and birthday, three oracles of 2050 read their sky while their Kin materializes, and the card is bound to them. Anyone else who taps that card adds that Kin to their own orbit. The ranking shows who scanned the most cards, plus every Kin at the party.

Next.js 16 on Vercel. During the party: Supabase (Postgres + Storage), images from varg with the playground's master prompt, readings through the Vercel AI Gateway. Now: a snapshot in the repository.

## The archive

`scripts/freeze.ts` copied the party out of Supabase on 25 November 2026 (`set -a; source .env.local; set +a; bun scripts/freeze.ts`, with the project's secret key). `lib/db.ts` reads the snapshot; nothing writes to it.

| Still works | Gone with the database |
| --- | --- |
| Every Kin's public card (`/c/<card number>`), its share picture, the ranking and All Kin, Fable's readings (single and pairs), the Mirror | Registering, collecting a Kin by tapping a pass, orbit requests, binding a pass, redraws, editing a profile, email login, the admin page, new pictures and clips |
| A phone signed in on the night: My Kin, its orbit, record, profile, Save picture / Save video | Signing in again on a phone that signed out or lost its cookie |
| Tapping a pass or opening a QR code from the night: it shows whose Kin it is | |

The repository is public, so only what the app already showed is in the snapshot: names, Kin, prophecies, profiles (bio, "ask me about", links), orbits and counts. Left out: emails, birthdays (each traveler's chart is kept instead: Sun, Moon, year animal, and early, middle or late in the sign, which is what Fable reads), image prompts, redraw notes, the oracles' first readings, guest-list rows and unanswered orbit requests. Pass codes and session cookies are kept only as SHA-256 hashes, so a pass and a signed-in phone still find their traveler, and neither can be forged from the file. Unanswered orbit requests were dropped; old mutual "friends" pairs became orbit entries, as the app did on a traveler's next visit.

Fable's readings come from the templates while `AI_PAUSED` is on (the default since the party); with `AI_PAUSED=false` the AI Gateway writes them as before, and they are kept in memory while the server runs (they used to be stored in the bucket).

## How the night worked

| Someone taps card `/app/t/<code>` | What happens |
| --- | --- |
| New phone, blank card | Registration: name → birthday → the closest guest on the list (asks "which one is you?" when unsure) → the oracles' reading while the image renders → reveal. The card is now theirs. |
| Owner's phone | Their own card, and how many travelers collected it. |
| Another registered phone | The Kin goes into that phone's orbit (+1 on the ranking; a repeat tap counts once). |
| Phone with no pilot, someone's card | Shows the Kin; registering from here also collects it. "This is my card" + birthday restores the owner's session on a new phone. |
| Registered phone without a card, blank card | Offers to bind the blank card to their existing Kin. |

The session was an httpOnly cookie (one year) tied to a row in `sessions`; the snapshot keeps the hash of each.

## The character

During the party, `lib/character.ts` filled the playground master prompt (`v6` in `../playground/presets.json`, copied to `lib/presets.json` by `bun scripts/sync-presets.ts`):

- **subject and scene**: the guest's totem and NFC-card scene from the guest list, translated to English in `data/guests.en.json`. Guests without a totem, and people not on the list, get their zodiac animal and a random scene.
- **traits and palette**: from the birthday's sign and element.
- **finish = rarity**: a weighted draw over the playground styles. Common 52% (plush, porcelain, airbrush), rare 28% (neon, cyborg, chrome), epic 15% (crystal, holo glass, wireframe), legendary 5% (diamond pavé). Epic and legendary cards get a holo sheen.
- **model**: GPT Image 2.6 (`background: opaque`), retried once, then Nano Banana 2.1, then Seedream 5.5. About 6¢ and 15–25 s per image.

The image was copied into the public `characters` bucket as a 900 px WebP (now `public/app/kin/<card number>.webp`). **The Kin comes alive**: once a picture was stored, MiniMax H3 animated it into a 5-second, 720p loop with the picture as first and last frame. The MP4s stay on varg's CDN (`s3.varg.ai`); the card fades the clip in over the picture once it plays (a phone in Low Power Mode or with reduced motion keeps the still). The owner gets **Save picture** (the file itself) and **Save video** (`/api/players/<id>/clip`, which streams the clip with an attachment header, since varg's CDN cannot be asked for a download).

The oracles' reading streamed from `google/gemini-2.5-flash`, then `openai/gpt-5-mini`, then a template; its last line is the card's prophecy.

## Setup

```bash
cd app
npm install
vercel link && vercel env pull .env.development.local   # AI Gateway token for Fable's readings
npm run site                       # copies the party site into public/ (optional for app work)
npm run dev                        # http://localhost:4400/app
```

## Deploy

Deploy from the repo root, not from `app/`: the build runs `../hub/site.py`, so it needs the whole repo (`.vercelignore` keeps the upload to what the build reads). Use a clean copy of `main` so nothing half-done in a working folder ships:

```bash
D=$(mktemp -d) && git archive origin/main | tar -x -C "$D" && cd "$D"
vercel link --yes --project the-future-2050 --scope alexmsecuritys-projects
vercel deploy                      # preview; previews are login-protected, check them with `vercel curl`
vercel deploy --prod               # vargafutureparty.com and the three .vercel.app addresses
```

## Rate limits

Vercel's DDoS mitigation and the Firewall rules set up for the party (2026-11-15) still guard project `the-future-2050`: per IP address, 3000 API reads a minute, 600 API writes a minute, 600 pass and share-picture loads a minute, plus rules for sign-ups, logins and the admin page that now match nothing. List or change them from a folder linked to the project: `vercel firewall rules list --expand`, `vercel firewall rules edit "<name>" …`, then `vercel firewall publish --yes`. The in-app limits went with the database, and so did everything they guarded. Fable's models stay off unless `AI_PAUSED=false` is set (`lib/paused.ts`); its templates answer instead.

## Files

| Path | What it is |
| --- | --- |
| `lib/frozen.json` | The snapshot: travelers, orbits, hashed passes and sessions, the scan count. |
| `lib/db.ts` | Reads the snapshot: the types, travelers by id and card number, pass and session lookups. |
| `lib/queries.ts` | The ranking, orbits, totals and circles worked out from it. |
| `public/app/kin/` | Every Kin picture (900 px WebP, 4 MB in all). |
| `scripts/freeze.ts` | Wrote the two above from Supabase. |
| `app/t/[code]/page.tsx` | A pass or QR code: whose Kin it is. |
| `lib/fable.ts`, `lib/astro.ts` | Fable's readings and the astrology under them. |
| `public/img/` | The three oracles and the station (generated with GPT Image 2.6). |
| `public/mirror/index.html` | The Mirror (`/mirror`): the camera page, its shaders and hand tracking in one file. |
| `app/api/mirror/route.ts` | The Kin the mirror shows: yours and your orbit, or the party's when signed out. |

## Pages

| Route | What it does |
| --- | --- |
| `/` and `/me` | Your Kin when this phone has a traveler: the card with Save picture / Save video, the share link with its QR, your profile, record and orbit. Without a traveler: the night in numbers and the top three. |
| `/scan` | The pass scanner. Android Chrome reads the pass in the page (Web NFC); an iPhone reads it itself when the pass touches the top edge. |
| `/login` | Says that logging in closed with the party. |
| `/me/profile` | Your profile as others saw it, and Sign out (for good). |
| `/c/<card number>` | The public card and the share link, with Fable's reading, and for a signed-in phone the pair reading and whether this Kin is in your orbit. |
| `/c/<card number>/card` | The picture a shared card link shows on X and in messengers: 1200 × 630 with the whole Kin, its name, whose Kin it is, the prophecy, rarity and the site's address (`next/og`, fonts in `assets/fonts/`). The owner's share panel has **Post on X**, which writes the post with the link. |

## The Mirror

Added 14 November 2026. **Mirror 2050** (`mirror/` in the repository root, eight camera effects that went viral on X) lives inside the app at **`/mirror`**, with the traveler's Kin as a ninth effect. It is the fourth knob on the deck, and **My Kin** has an "Open the mirror" panel.

| Effect | What it does |
| --- | --- |
| 1 · Your Kin | Open your palm and your Kin lands on it as a hologram; a fist hides it. The Kin in your orbit circle around your head and fade when they pass behind you (body segmentation). Signed out, the party's Kin circle instead, and each new open palm catches the next one. Mouse or finger drag carries the Kin without hand tracking. |
| 2–9 | Liquid Air, Neon Swarm, Holo Cube, Portal, Shatter, Time Warp, Matrix, Cloak: the effects of Mirror 2050, unchanged except for the app's look (blue futurism, Unbounded / Geologica / Martian Mono). |

- **One static file.** `public/mirror/index.html` is served at `/mirror` by a rewrite in `next.config.ts`. It is a page of its own, outside the React layout, so the camera runs at the top level and the starfield and deck do not draw underneath it. Links to it are plain `<a>` tags, not `<Link>`.
- **Data.** On load it asks `GET /api/mirror` (no cache): signed in, `{me, orbit}`; signed out, `party` (up to 12 random drawn Kin). Only first name, card number, Kin name and picture, the same as the ranking. The pictures are the app's own files (`/app/kin/`), so a canvas with a Kin on it stays clean and snapshots can still be saved.
- **Camera and models.** Camera frames stay in the browser. MediaPipe Tasks (hands, selfie segmentation) and its models load from jsDelivr and Google's model storage, so the mirror needs the internet (the standalone `mirror/` can run offline from its `vendor/`).
- **Snapshot** (`S` or the Snapshot button): a JPEG signed THE FUTURE 2050 and vargafutureparty.com, with the traveler's card number when signed in. A sheet shows it with **Share** (the phone's share sheet, where the browser can share files) and **Save**.
- **Addresses**: `/mirror?fx=kin` (or `liquid`, `swarm`, `holo`, `portal`, `shatter`, `time`, `matrix`, `cloak`) opens on one effect; `?party` starts at once, hides the controls and changes effect every 25 s (the projector); `?hands=0`, `?hud=0`, `?mirror=0`, `?delegate=cpu` as in Mirror 2050. A phone's rear camera is not mirrored.
- **Keys**: `1`–`9` effects, `←` `→`, `H` hand HUD, `A` party mode, `S` snapshot, `C` next camera, `M` mirror, `B` relearn the room (Cloak), `F` fullscreen, `I` sources, `Space` hide the controls.
- **Changing it**: edit `public/mirror/index.html` directly; it has no build step. Effects from `mirror/index.html` can be copied over: the effect objects and shaders are the same.

