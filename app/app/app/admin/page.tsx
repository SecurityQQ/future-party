import { notFound } from "next/navigation";
import { db, type Player } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { styleLabel } from "@/lib/character";
import AdminPanel, { type Row } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · The Future 2050", robots: { index: false } };

// /admin?key=<ADMIN_KEY>: every character with its status and its clip's, redraw buttons, and a tag URL generator.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!isAdmin(key)) notFound();
  const [{ data: players }, { data: tags }, { data: guests }, { data: videos }] = await Promise.all([
    db().from("players").select("id, card_no, name, character, sign, style, status, error, image_url, video_url, attempts, model, guest_id, match_score, created_at").order("card_no", { ascending: false }),
    db().from("tags").select("code, player_id, claimed_at"),
    db().from("guests").select("id, name"),
    db().from("videos").select("image_url, status, attempts, error"),
  ]);
  const clipOf = new Map((videos ?? []).map((v: any) => [v.image_url, v]));
  const guestName = new Map((guests ?? []).map((g: any) => [g.id, g.name]));
  const tagOf = new Map((tags ?? []).filter((t: any) => t.player_id).map((t: any) => [t.player_id, t.code]));
  const rows = (players ?? []).map((p: any) => ({
    ...(p as Player),
    finish: styleLabel(p.style),
    guest: p.guest_id ? (guestName.get(p.guest_id) as string) : null,
    tag: (tagOf.get(p.id) as string) ?? null,
    clip: p.image_url ? ((clipOf.get(p.image_url) as Row["clip"]) ?? null) : null,
  }));
  return (
    <main className="shell wide stack">
      <AdminPanel adminKey={key!} rows={rows} tagsTotal={tags?.length ?? 0} tagsClaimed={tagOf.size} />
    </main>
  );
}
