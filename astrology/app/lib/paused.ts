import "server-only";

// After the party: the Station stays open so travelers can revisit their cards, but the
// costly machines (varg images, AI readings) are switched off so nobody can spend our
// tokens. Set AI_PAUSED=false in the environment to switch them back on.
export function aiPaused(): boolean {
  return process.env.AI_PAUSED !== "false";
}
