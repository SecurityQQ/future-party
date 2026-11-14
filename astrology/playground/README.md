# Zodiac Creatures playground

A local page for tuning the master prompt behind the zodiac companion characters. A birthday picks a sign, the sign picks an animal, its traits and an element palette. These fill the master prompt, and varg generates a batch you rate.

```bash
cd astrology/playground
bun --watch server.ts      # http://localhost:4300
```

The varg key is read from `VARG_API_KEY` or `~/.varg/credentials` and stays on the server.

## The loop

1. Pick a birthday or a sign (or type any subject), choose styles, scenes and models, and press Generate (⌘↵). The batch spreads evenly over everything selected, so each image tests a different combination.
2. Rate: click the stars, or open an image and press `1`–`5`, `←` `→` to move, `N` for a note. Write what works or doesn't in the batch note at the top.
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

Placeholders in the master prompt: `{subject} {sign} {traits} {palette} {style} {scene}`. A line whose placeholder is empty is dropped, so deselecting every scene removes the `Setting:` line.

Reference images (optional, up to 6, from `../assets`) are sent with the prompt as mood and material inspiration. All models in the list accept them. GPT Image can pick up artifacts from them.
