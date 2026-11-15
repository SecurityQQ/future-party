// Titles by how many cards someone has collected.
const RANKS: [number, string][] = [
  [25, "Legend of 2050"],
  [15, "Futurist"],
  [10, "Pathfinder"],
  [6, "Navigator"],
  [3, "Connector"],
  [1, "Explorer"],
  [0, "New Arrival"],
];
export function rankTitle(collected: number): string {
  return RANKS.find(([min]) => collected >= min)![1];
}
export function nextRank(collected: number): { title: string; need: number } | null {
  const up = [...RANKS].reverse().find(([min]) => min > collected);
  return up ? { title: up[1], need: up[0] - collected } : null;
}
