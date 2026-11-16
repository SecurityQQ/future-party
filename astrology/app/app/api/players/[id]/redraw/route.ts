import { NextResponse, after } from "next/server";
import { toCard } from "@/lib/db";
import { REDRAWS, getPlayer, pollUntilSettled, redrawWithFeedback, swapVersion } from "@/lib/character";
import { currentPlayer } from "@/lib/session";
import { aiPaused } from "@/lib/paused";

export const maxDuration = 300;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// The owner's one redraw: { feedback } draws the Kin again with their notes.
// { swap: true } switches between the first picture and the redraw.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const me = await currentPlayer();
  const p = await getPlayer(id);
  if (!p || me?.id !== p.id) return fail("Not your character", 403);

  if (body.swap) {
    if (!p.prev_image_url) return fail("There is no other version.", 409);
    if (p.status !== "done" && p.status !== "failed") return fail("Wait until the redraw is finished.", 409);
    const next = await swapVersion(p);
    return NextResponse.json({ ...toCard(next), has_prev: !!next.prev_image_url });
  }

  const feedback = String(body.feedback ?? "").trim().replace(/\s+/g, " ");
  if (aiPaused()) return fail("The oracles are resting; redraws are closed for now.", 503);
  if (feedback.length < 3) return fail("Tell the oracles what to change.");
  if (feedback.length > 400) return fail("Keep it under 400 characters.");
  if (p.redraws >= REDRAWS) return fail("You already used your redraw.", 409);
  if (p.status !== "done") return fail("Wait until your Kin has appeared.", 409);
  const next = await redrawWithFeedback(p, feedback);
  after(() => pollUntilSettled(p.id));
  return NextResponse.json({ status: next.status });
}
