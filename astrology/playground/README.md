# Zodiac Creatures playground

A local page for tuning the master prompt behind the zodiac companion characters. A birthday picks a sign, the sign picks an animal, its traits and an element palette. These fill the master prompt, and varg generates a batch you rate.

```bash
cd astrology/playground
bun --watch server.ts      # http://localhost:4300
```

The varg key is read from `VARG_API_KEY` or `~/.varg/credentials` and stays on the server.

## The loop

1. Pick a birthday or a sign (or type any subject), choose styles, scenes and models, and press Generate (⌘↵). The batch spreads evenly over everything selected, so each image tests a different combination.
2. Rate: click the stars, or open an image and press `1`–`5`, `←` `→` to move, `N` for a note on the image, `P` for feedback on the prompt itself (how well it is designed, separate from how the image looks), `R` to use the image as a reference. There is also a note per batch and a feedback field per master prompt version.
3. Ask Claude to read the feedback (`curl localhost:4300/api/feedback`, or the `runs/*/run.json` files). It edits `presets.json`: a new master prompt version, better style or scene texts, a different animal for a sign.
4. **Insights** shows average stars by style, scene, model, master version and subject. **Best** collects every image rated 4★ or higher.

## Files

| File | What it is |
| --- | --- |
| `presets.json` | Master prompt versions, the style and scene pools, the zodiac table (sign, dates, animal, traits, element), element palettes, models. The server re-reads it on every page load. |
| `server.ts` | Bun server: builds prompts, starts varg image jobs, polls them, downloads the images, stores ratings. |
| `index.html` | The page. |
| `runs/<id>/` | One folder per batch: `run.json` (inputs, exact prompt per image, model, cost, rating, note) and the images. |
| `.cache/` | Thumbnails and the varg URLs of uploaded reference images. |

**The party app** (`../app`, https://zodiac-rangers.vercel.app) draws every guest's character with master **v6** and these styles as card finishes. After changing `presets.json`, run `bun scripts/sync-presets.ts` in `../app` and redeploy.

Placeholders in the master prompt: `{subject} {sign} {traits} {palette} {style} {scene} {backdrop}`. A line whose placeholder is empty is dropped, so deselecting every scene removes the `Setting:` line.

## Figure and ground contrast

An abstract rule ("a light creature against a darker background and vice versa", master v4) barely changed what GPT Image drew: the concrete scene text wins. Master v5 instead fills `{backdrop}` with a concrete instruction picked by the creature's tone (`tone` per sign in the zodiac table, editable under Zodiac fields; styles with `"tone": "glow"` override it):

| Tone | Backdrop |
| --- | --- |
| dark (black panther) | bright, airy, hazy scene with a glow behind the creature |
| light (bunny) | dusk shadow, darker values, a vignette |
| glow (holographic glass, wireframe) | night, deep shadow |
| mid (most animals) | muted background in a complementary hue, a pool of light behind |

Each image gets an automatic, rough contrast score: the colour difference between the centre of the frame (where the creature sits) and its edges. It shows on the cards, in the feedback digest and in Insights. On four hard cases v5 scored 21–27 against v4's 4–16.

**Compare with** under the master prompt draws every combination with two versions side by side (for example v5 vs v4).

## Comparing models

Tick **Compare** under Models: each prompt goes, identical and with the same references, to every selected model. The slider then counts prompts (1 prompt × 10 models = 10 images), and the batch is shown in groups, one per prompt, with the model name on each card. **All models** on any card sends that exact prompt to every other model. Rate them and Insights → Models ranks the models. A batch opens directly with `http://localhost:4300/#run=<run id>`.

Models differ in how many reference images they take: `maxRefs` in `presets.json` (MAI Image: 1) caps what is sent.

## Reference images

Images sent to the model with the prompt, so it copies real detail instead of guessing from words.

- **Each style and scene has its own board picture** (`refs` in `presets.json`). With "Each style sends its own reference images" on, a crystal creature gets the crystal parrot, a wireframe one the dotted octopus, and so on.
- **Your own references**: drag images onto the page, paste with ⌘V, choose files or paste a direct image link. They are saved to `../assets/uploads/` and sent with every image in the batch (up to 6). "Use as ref" on any result adds that image.
- **Mode**: *Match the look* (copy material, detail, light), *Mood only* (palette and finish), *Same character* (keep a generated character's design, change only what the prompt says).
- **A/B**: every combination is made once with references and once without; Insights → References compares them.

## GPT Image: transparent backgrounds

GPT Image 2.6 decides on its own to return a partly transparent PNG for some prompts (mostly glass and wireframe styles: about 18% of its first 130 images). Shown on white or flattened, those areas look like a grey or white pixel mosaic. `presets.json` now sends `background: "opaque"` for GPT models (`providerOptions`), which fixed it in every test. The server flags any image that still has transparency ("transparent bg" tag, `transparent` in run.json), and the Zodiac set view ranks such images last.

## Moderation

Flux and Seedream refuse some cute-animal prompts as if they were about children. The trigger was "baby" next to "lovable", "full body" and "never childish" (Flux), and "baby" with any reference image (Seedream). Master v3 and the animal names avoid these words ("otter pup", "parrot chick", "whale calf"). A refused image is retried once automatically and has a Retry button.
