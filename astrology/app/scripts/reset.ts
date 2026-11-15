// Wipe every pilot, card claim, collection, friendship, login code, scan and character image, and restart card numbers
// at 001. The guest list stays. Run from astrology/app:  bun scripts/reset.ts --yes
import { SQL } from "bun";
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--yes")) {
  console.log("This deletes all players, tags, collections, scans and images. Run again with --yes.");
  process.exit(1);
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const bucket = supabase.storage.from("characters");

let removed = 0;
for (;;) {
  const { data: folders, error } = await bucket.list("", { limit: 100 });
  if (error) throw error;
  if (!folders?.length) break;
  const before = removed;
  for (const f of folders) {
    const { data: files } = await bucket.list(f.name, { limit: 1000 });
    const paths = (files ?? []).map((x) => `${f.name}/${x.name}`);
    if (paths.length) {
      const { error: e } = await bucket.remove(paths);
      if (e) throw e;
      removed += paths.length;
    } else {
      await bucket.remove([f.name]);
    }
  }
  if (removed === before) break; // nothing left that can be removed
}

const sql = new SQL(process.env.DATABASE_URL!);
await sql`truncate scans, collections, friends, login_codes, sessions, tags, players restart identity cascade`;
const [{ guests }] = await sql`select count(*)::int as guests from guests`;
await sql.close();
console.log(`removed ${removed} images; players, tags, collections, friends, login codes, scans and sessions emptied; ${guests} guests kept`);
