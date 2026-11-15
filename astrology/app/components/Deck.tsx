"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  station: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3.2" /><ellipse cx="12" cy="12" rx="10" ry="4" /><path d="M12 2v4M12 18v4" /></svg>
  ),
  hold: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="11" height="15" rx="1" /><path d="M8 3h11a1 1 0 0 1 1 1v13" /><path d="M6 15l2.5-3 2 2 1.5-2" /></svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M3.5 9a6 6 0 0 1 0 6M1 6.5a10 10 0 0 1 0 11M20.5 9a6 6 0 0 1 0 6M23 6.5a10 10 0 0 1 0 11" /></svg>
  ),
  ranking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>
  ),
};

// The fixed control deck at the bottom: three round knobs like a cockpit console.
export default function Deck() {
  const path = usePathname();
  const items = [
    { href: "/", label: "My Kin", icon: icons.hold, on: path === "/" || path.startsWith("/me") },
    { href: "/scan", label: "Scan", icon: icons.scan, on: path.startsWith("/scan"), main: true },
    { href: "/leaderboard", label: "Ranking", icon: icons.ranking, on: path.startsWith("/leaderboard") },
  ];
  return (
    <nav className="deck" aria-label="Main">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={it.main ? "main" : undefined} aria-current={it.on ? "page" : undefined}>
          <span className="knob">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
