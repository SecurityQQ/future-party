"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Sign this phone out, for good: logging in closed with the party.
export default function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn ghost small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        window.dispatchEvent(new Event("zr:pilot"));
        router.push("/app");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out on this phone"}
    </button>
  );
}
