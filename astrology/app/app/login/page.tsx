import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import TopBar from "@/components/TopBar";
import EmailLogin from "@/components/EmailLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in · The Future 2050", robots: { index: false } };

// Email login. The link in the login email lands here with ?email=..&code=.. and signs in by itself.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string; code?: string; next?: string }> }) {
  const { email = "", code = "", next = "/" } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const me = await currentPlayer();
  if (me && !code) redirect(safeNext);
  return (
    <main className="shell stack">
      <TopBar me={me} />
      <EmailLogin initialEmail={email} initialCode={/^\d{6}$/.test(code) ? code : ""} next={safeNext} />
    </main>
  );
}
