// Copy what the app needs from the playground's presets.json (the master prompt, styles,
// scenes, zodiac table, element palettes, backdrops, model options) into lib/presets.json.
// Run after changing the playground presets: bun scripts/sync-presets.ts [masterId]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const src = JSON.parse(readFileSync(join(root, "../astrology/playground/presets.json"), "utf8"));
const masterId = process.argv[2] || "v6";
const master = src.masters.find((m: any) => m.id === masterId);
if (!master) throw new Error(`no master ${masterId} in playground/presets.json`);

const out = {
  syncedFrom: "astrology/playground/presets.json",
  syncedAt: new Date().toISOString().slice(0, 10),
  master: { id: master.id, text: master.text },
  styles: src.styles.map(({ refs, ...s }: any) => s),
  scenes: src.scenes.map(({ refs, ...s }: any) => s),
  zodiac: src.zodiac,
  elements: src.elements,
  backdrops: src.backdrops,
  models: src.models,
};
writeFileSync(join(root, "lib/presets.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`lib/presets.json ← master ${master.id}, ${out.styles.length} styles, ${out.scenes.length} scenes`);
