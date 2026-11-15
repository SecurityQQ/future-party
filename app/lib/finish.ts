import presets from "./presets.json";

// Card look without rarity: the frame takes the element's color, and the see-through finishes
// get a holo sheen. Safe to import from client components.
const HOLO = new Set(["crystal", "hologlass", "wireframe", "rhinestone"]);

export function finishLabel(id: string): string {
  return presets.styles.find((s) => s.id === id)?.label ?? id;
}

export function cardClass(c: { element: string; style: string }): string {
  return `el-${c.element}${HOLO.has(c.style) ? " holo" : ""}`;
}
