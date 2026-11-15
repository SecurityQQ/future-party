"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  // The party site's mark: a planet in a tilted orbit, as in the front page's top bar
  party: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="11" ry="3.8" transform="rotate(-25 12 12)" /></svg>
  ),
  station: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3.2" /><ellipse cx="12" cy="12" rx="10" ry="4" /><path d="M12 2v4M12 18v4" /></svg>
  ),
  hold: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="11" height="15" rx="1" /><path d="M8 3h11a1 1 0 0 1 1 1v13" /><path d="M6 15l2.5-3 2 2 1.5-2" /></svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M3.5 9a6 6 0 0 1 0 6M1 6.5a10 10 0 0 1 0 11M20.5 9a6 6 0 0 1 0 6M23 6.5a10 10 0 0 1 0 11" /></svg>
  ),
  mirror: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><ellipse cx="12" cy="9.5" rx="6.5" ry="7.5" /><path d="M12 17v5M8.5 22h7" /><path d="M9 6.8a3.6 3.6 0 0 1 3-1.8" /></svg>
  ),
  ranking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>
  ),
};

// The site's address. On the app's old addresses / is the app itself (next.config.ts), so the Party knob goes here.
const MAIN = "https://vargafutureparty.com/";
const OLD_HOST = /^(?:zodiac-rangers|the-future-2050)\.vercel\.app$/;

// The fixed control deck at the bottom: round knobs like a cockpit console. The party's front page (/) shows the
// same deck with Party lit (hub/template.html), so a phone switches between the site and the app with one tap.
// The front page and the mirror (a full-screen camera page, public/app/mirror) are outside the React shell,
// so they get plain links.
export default function Deck() {
  const path = usePathname();
  const [party, setParty] = useState("/");
  useEffect(() => {
    if (OLD_HOST.test(location.hostname)) setParty(MAIN);
  }, []);
  const items = [
    { href: party, label: "Party", icon: icons.party, on: false, page: true },
    { href: "/app", label: "My Kin", icon: icons.hold, on: path === "/app" || path.startsWith("/app/me") },
    { href: "/app/scan", label: "Scan", icon: icons.scan, on: path.startsWith("/app/scan"), main: true },
    { href: "/app/mirror", label: "Mirror", icon: icons.mirror, on: false, page: true },
    { href: "/app/leaderboard", label: "Ranking", icon: icons.ranking, on: path.startsWith("/app/leaderboard") },
  ];
  return (
    <nav className="deck" aria-label="Main">
      {items.map((it) => {
        const inner = (
          <>
            <span className="knob">{it.icon}</span>
            {it.label}
          </>
        );
        return it.page ? (
          <a key={it.href} href={it.href}>{inner}</a>
        ) : (
          <Link key={it.href} href={it.href} className={it.main ? "main" : undefined} aria-current={it.on ? "page" : undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
