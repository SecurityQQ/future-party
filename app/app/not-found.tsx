import Link from "next/link";
import Hull from "@/components/Hull";

export default function NotFound() {
  return (
    <main className="shell stack">
      <Hull title="Lost in hyperspace" led="red">
        <p style={{ marginTop: 0 }}>These coordinates lead nowhere. If you scanned a card, try tapping it again.</p>
        <Link className="btn" href="/app">Return to the station</Link>
        <a className="btn ghost" href="/">The party's front page</a>
      </Hull>
    </main>
  );
}
