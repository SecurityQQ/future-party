import { notFound } from "next/navigation";
import { db, type Player } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { styleLabel } from "@/lib/character";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Kin 2050", robots: { index: false } };

// /admin?key=<ADMIN_KEY>: every character with its status, redraw buttons, and a tag URL generator.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!isAdmin(key)) notFound();
  const [{ data: players }, { data: tags }, { data: guests }] = await Promise.all([
    db().from("players").select("id, card_no, name, character, sign, style, status, error, image_url, attempts, model, guest_id, match_score, created_at").order("card_no", { ascending: false }),
    db().from("tags").select("code, player_id, claimed_at"),
    db().from("guests").select("id, name"),
  ]);
  const guestName = new Map((guests ?? []).map((g: any) => [g.id, g.name]));
  const tagOf = new Map((tags ?? []).filter((t: any) => t.player_id).map((t: any) => [t.player_id, t.code]));
  const rows = (players ?? []).map((p: any) => ({
    ...(p as Player),
    finish: styleLabel(p.style),
    guest: p.guest_id ? (guestName.get(p.guest_id) as string) : null,
    tag: (tagOf.get(p.id) as string) ?? null,
  }));
  return (
    <main className="shell wide stack">
      <AdminPanel adminKey={key!} rows={rows} tagsTotal={tags?.length ?? 0} tagsClaimed={tagOf.size} />
    </main>
  );
}
