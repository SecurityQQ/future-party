import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import TopBar from "@/components/TopBar";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile · The Future 2050" };

export default async function ProfilePage() {
  const me = await currentPlayer();
  if (!me) redirect("/app");
  return (
    <main className="shell stack">
      <TopBar me={me} />
      <ProfileForm initial={{ name: me.name, email: me.email ?? "", bio: me.bio ?? "", ask_me: me.ask_me ?? "", links: me.links ?? {} }} />
    </main>
  );
}
