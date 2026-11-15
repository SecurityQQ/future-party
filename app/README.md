# The Future 2050

The party app for Varga Future Party 2050: **https://www.vargafutureparty.com/app**, on the party's own site. One Vercel project, `the-future-2050` (root directory `app/`), serves the app under `/app` and the party site everywhere else (the static pages `npm run site` builds from the repo into `public/`).

Passes written with the first address, `zodiac-rangers.vercel.app/t/<code>`, keep working: that address and the-future-2050.vercel.app still belong to the project. A phone without a traveler is sent from them to vargafutureparty.com; a phone that already has one stays on its address, where its session cookie is. The app's old paths (`/t/<code>`, `/c/<n>`, `/me`, `/login`, `/scan`, `/leaderboard`, `/admin?key=`) redirect to `/app/...` (`next.config.ts`).

**Files.** Pages are in `app/app/` (the `/app` segment); the API stays at `app/api/` (`/api`). The app's own static files are in `public/app/` (`/app/img`, `/app/vibes`, `/app/mirror`); everything else in `public/` is the party site, git-ignored and rewritten by every build.

**The story.** It is 2050, and nobody arrives alone. Every traveler is met by their Kin: a companion from the future, shaped by the sky they were born under and the life they lead. Three oracles at Arrival Station read your sky while your Kin crosses over. Then you tap the pass of everyone you meet, and their Kin joins your orbit. The future is who you meet.

**The words.** traveler (a guest), pass (the NFC card), Kin (the companion creature), orbit (the Kin you collected), oracles (Vexa, Grumm, Ilu), Arrival Station (the home page). The code keeps the old identifiers (`hold`, `pilot`, `astrologers`).

A guest taps their pass (an RFID/NFC tag) on their phone. The page asks for their name and birthday, three oracles of 2050 read their sky while their Kin materializes, and the card is bound to them. Anyone else who taps that card adds that Kin to their own orbit. The ranking shows who scanned the most cards, plus every Kin at the party.

Next.js 16 on Vercel, Supabase (Postgres + Storage), images from varg with the playground's master prompt, readings through the Vercel AI Gateway.

## The flow

| Someone taps card `/app/t/<code>` | What happens |
| --- | --- |
| New phone, blank card | Registration: name → birthday → the closest guest on the list (asks "which one is you?" when unsure) → the oracles' reading while the image renders → reveal. The card is now theirs. |
| Owner's phone | Their own card, and how many travelers collected it. |
| Another registered phone | The Kin goes into that phone's orbit (+1 on the ranking; a repeat tap counts once). |
| Phone with no pilot, someone's card | Shows the Kin; registering from here also collects it. "This is my card" + birthday restores the owner's session on a new phone. |
| Registered phone without a card, blank card | Offers to bind the blank card to their existing Kin. |

The session is an httpOnly cookie (one year) tied to a row in `sessions`.

## The character

`lib/character.ts` fills the playground master prompt (`v6` in `../playground/presets.json`, copied to `lib/presets.json` by `bun scripts/sync-presets.ts`):

- **subject and scene**: the guest's totem and NFC-card scene from the guest list, translated to English in `data/guests.en.json`. Guests without a totem, and people not on the list, get their zodiac animal and a random scene.
- **traits and palette**: from the birthday's sign and element.
- **finish = rarity**: a weighted draw over the playground styles. Common 52% (plush, porcelain, airbrush), rare 28% (neon, cyborg, chrome), epic 15% (crystal, holo glass, wireframe), legendary 5% (diamond pavé). Epic and legendary cards get a holo sheen.
- **model**: GPT Image 2.6 (`background: opaque`), retried once, then Nano Banana 2.1, then Seedream 5.5. About 6¢ and 15–25 s per image.

The image is copied into the public `characters` bucket as a 900 px WebP. Each poll of `/api/players/<id>` moves the job along, and `after()` keeps polling for 4.5 minutes if the guest closes the page.

The reading streams from `google/gemini-2.5-flash`, then `openai/gpt-5-mini` (the two models the gateway's free tier allows), then a template, so the loader never stalls. After adding gateway credits, set `READING_MODEL=anthropic/claude-haiku-5.5` on Vercel to try that first.

## Running the party

- **Tags**: open `/app/admin?key=<ADMIN_KEY>` (the key is in `.env.local` and on Vercel), press Generate and write one URL per tag (NFC Tools → Write → URL). The codes are random, so nobody can collect a card by typing an address. Any `/app/t/<code>` (or the old `/t/<code>`) works, so you can also write your own codes.
- **Fix a bad image**: on `/app/admin`, Redraw (same finish) or Reroll finish.
- **Start clean** (after testing): `set -a; source .env.local; set +a; bun scripts/reset.ts --yes`. This empties players, tags, scans and images and keeps the guest list.
- **Wall screen**: `/app/leaderboard` refreshes itself every 15 s.

## Setup from scratch

```bash
cd app
npm install
cp .env.example .env.local        # fill in; see the comments there
set -a; source .env.local; set +a
psql "$DATABASE_URL" -f supabase/schema.sql
python3 -I scripts/import_guests.py data/guests.en.json "<path to Future_Party_Guests.xlsx>" | psql "$DATABASE_URL"
vercel link && vercel env pull .env.development.local   # AI Gateway token for local readings
npm run site                       # copies the party site into public/ (optional for app work)
npm run dev                        # http://localhost:4400/app
```

## Deploy

Deploy from the repo root, not from `app/`: the build runs `../hub/site.py`, so it needs the whole repo (`.vercelignore` keeps the upload to what the build reads). Use a clean copy of `main` so nothing half-done in a working folder ships:

```bash
D=$(mktemp -d) && git archive origin/main | tar -x -C "$D" && cd "$D"
vercel link --yes --project the-future-2050 --scope alexmsecuritys-projects
vercel deploy                      # preview; previews are login-protected, check them with `vercel curl`
vercel deploy --prod               # www.vargafutureparty.com and the three .vercel.app addresses
```

`schema.sql` turns on row level security with no policies and revokes the public roles, so the publishable key cannot read anything. The server uses the secret key. Only guest name, aliases, totem, scene and interests are imported from the spreadsheet; notes, sources and social links stay out of the database.

## Files

| Path | What it is |
| --- | --- |
| `app/t/[code]/page.tsx` | The scan: decides which of the cases above applies, records the scan, collects. |
| `components/ScanScreen.tsx` | The screens for each case. |
| `components/RegisterQuest.tsx` | Registration as a text-quest dialogue. |
| `components/AstroLoader.tsx` | The streamed reading, star chart, synthesis log, reveal. |
| `lib/match.ts` | Name → guest: Cyrillic transliteration, nicknames (Dima, Sasha, Katya…), Jaro-Winkler per word. |
| `lib/character.ts` | Prompt, finish, varg job, retries, storage. |
| `lib/reading.ts` | The oracles' prompt, model chain, template. |
| `app/api/*` | register, players/[id] (status), reading, claim, restore, me, admin/regenerate. |
| `supabase/schema.sql` | Tables, the `leaderboard` view, RLS, the storage bucket. |
| `scripts/` | Guest import, presets sync, reset. |
| `public/img/` | The three oracles and the station (generated with GPT Image 2.6). |
| `public/mirror/index.html` | The Mirror (`/mirror`): the camera page, its shaders and hand tracking in one file. |
| `app/api/mirror/route.ts` | The Kin the mirror shows: yours and your orbit, or tonight's when signed out. |

## Logging in, profiles, friends, sharing

Added 14 November 2026. They need the additive part of `supabase/schema.sql` (new `players` columns: `email`, `bio`, `ask_me`, `links`, `redraws`, `feedback`, `prev_image_url`; new tables `login_codes` and `friends`). Run the schema file again; it is idempotent.

| Route | What it does |
| --- | --- |
| `/` and `/me` | Your Kin when this phone has a traveler: the card, the one redraw, the share link with its QR, your profile, record, friends and orbit. Without a traveler: the pass scanner. |
| `/scan` | The pass scanner. Android Chrome reads the pass in the page (Web NFC); an iPhone reads it itself when the pass touches the top edge. |
| `/login` | Email → six-digit code → signed in. The email's link (`/login?email=…&code=…`) signs in by itself. |
| `/me/profile` | Optional profile: name, a line about you, "ask me about", Instagram / Telegram / X / LinkedIn / website, and the login email (never shown). |
| `/c/<card number>` | The public card and the share link. Anyone signed in gets **Become friends** (mutual, instant). Friends do not count on the ranking; only tapping a pass does. |

- **Email login** uses Resend: set `RESEND_API_KEY` and `EMAIL_FROM` (an address on a domain verified in Resend). Without a key, preview and local builds show the code on the page so the flow can be tested; production answers that email login is not on yet. Codes are stored as an HMAC (`LOGIN_PEPPER`, falling back to the Supabase secret key), last 15 minutes, allow 5 tries, and at most 5 are sent per email per hour.
- **Registration** asks for an email after the birthday (it can be skipped and added later in the profile) and sends a welcome email when Resend is set up.
- **Redraw**: right after the reveal, a traveler can redraw their Kin once with notes on what to change (`/api/players/<id>/redraw`). The notes are added to the image prompt; the first picture is kept, and they can switch between the two versions.
- **No rarity on screen**: the frame takes the element's color and see-through finishes keep the holo sheen. The `rarity` column is still written but never shown.

## The Mirror

Added 14 November 2026. **Mirror 2050** (`mirror/` in the repository root, eight camera effects that went viral on X) lives inside the app at **`/mirror`**, with the traveler's Kin as a ninth effect. It is the fourth knob on the deck, and **My Kin** has an "Open the mirror" panel.

| Effect | What it does |
| --- | --- |
| 1 · Your Kin | Open your palm and your Kin lands on it as a hologram; a fist hides it. The Kin in your orbit circle around your head and fade when they pass behind you (body segmentation). Signed out, tonight's Kin circle instead, and each new open palm catches the next one. Mouse or finger drag carries the Kin without hand tracking. |
| 2–9 | Liquid Air, Neon Swarm, Holo Cube, Portal, Shatter, Time Warp, Matrix, Cloak: the effects of Mirror 2050, unchanged except for the app's look (blue futurism, Unbounded / Geologica / Martian Mono). |

- **One static file.** `public/mirror/index.html` is served at `/mirror` by a rewrite in `next.config.ts`. It is a page of its own, outside the React layout, so the camera runs at the top level and the starfield and deck do not draw underneath it. Links to it are plain `<a>` tags, not `<Link>`.
- **Data.** On load it asks `GET /api/mirror` (no cache): signed in, `{me, orbit}`; signed out, `party` (up to 12 random drawn Kin). Only first name, card number, Kin name and picture, the same as the ranking. The route only reads the database. Pictures come from the public `characters` bucket, which sends `Access-Control-Allow-Origin: *`, so snapshots with a Kin in them can still be saved.
- **Camera and models.** Camera frames stay in the browser. MediaPipe Tasks (hands, selfie segmentation) and its models load from jsDelivr and Google's model storage, so the mirror needs the internet (the standalone `mirror/` can run offline from its `vendor/`).
- **Snapshot** (`S` or the Snapshot button): a JPEG signed THE FUTURE 2050, with the traveler's card number when signed in. A sheet shows it with **Share** (the phone's share sheet, where the browser can share files) and **Save**.
- **Addresses**: `/mirror?fx=kin` (or `liquid`, `swarm`, `holo`, `portal`, `shatter`, `time`, `matrix`, `cloak`) opens on one effect; `?party` starts at once, hides the controls and changes effect every 25 s (the projector); `?hands=0`, `?hud=0`, `?mirror=0`, `?delegate=cpu` as in Mirror 2050. A phone's rear camera is not mirrored.
- **Keys**: `1`–`9` effects, `←` `→`, `H` hand HUD, `A` party mode, `S` snapshot, `C` next camera, `M` mirror, `B` relearn the room (Cloak), `F` fullscreen, `I` sources, `Space` hide the controls.
- **Changing it**: edit `public/mirror/index.html` directly; it has no build step. Effects from `mirror/index.html` can be copied over: the effect objects and shaders are the same.

