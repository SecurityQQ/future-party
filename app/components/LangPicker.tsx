"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_NAME, LANGS, type Lang } from "@/lib/i18n";

// A small globe pill: Fable's six languages. The choice is a cookie for a year; the page re-renders in it.
export default function LangPicker({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const choose = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    window.dispatchEvent(new Event("zr:lang"));
    if (l !== lang) router.refresh();
  };
  return (
    <div className="lang" ref={box}>
      <button type="button" className="lang-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" />
        </svg>
        {lang.toUpperCase()}
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={label}>
          {LANGS.map((l) => (
            <li key={l}>
              <button type="button" role="option" aria-selected={l === lang} lang={l} onClick={() => choose(l)}>
                <span>{LANG_NAME[l]}</span>
                <small>{l.toUpperCase()}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
