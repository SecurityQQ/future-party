"use client";
import { useEffect, useState, type ReactNode } from "react";

// You · Friends · Party on the Fable page: every panel is rendered on the server; the tabs only show one.
// The tab lives in the address (#you, #friends, #party) so a shared link opens the right one.
export default function FableTabs({ tabs, children }: { tabs: { id: string; label: string }[]; children: ReactNode[] }) {
  const [on, setOn] = useState(tabs[0].id);
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (tabs.some((t) => t.id === h)) setOn(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);
  const pick = (id: string) => {
    setOn(id);
    history.replaceState(null, "", `#${id}`);
  };
  return (
    <>
      <div className="fable-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={on === t.id} aria-controls={`panel-${t.id}`} onClick={() => pick(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={on !== t.id} className="stack">
          {children[i]}
        </div>
      ))}
    </>
  );
}
