"use client";
import { useEffect, useRef, useState } from "react";
import { useTypewriter } from "./useTypewriter";

type Words = { reading: string; lost: string };
const EN: Words = { reading: "Fable is reading…", lost: "Fable lost the signal. Look again in a minute." };

// A Fable text fetched when it scrolls into view (the first time, Fable writes it): one traveler's reading
// (/api/fable/<id>) or, with `pair`, the signed-in traveler read together with <id> (/api/fable/pair/<id>).
export default function FableReading({ id, big = false, lang = "en", words = EN, pair = false }: { id: string; big?: boolean; lang?: string; words?: Words; pair?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState(big);
  const { shown } = useTypewriter(text, big ? 60 : 120);

  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "600px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    let alive = true;
    setText("");
    setFailed(false);
    fetch(`/api/fable/${pair ? "pair/" : ""}${id}?lang=${lang}`)
      .then((r) => r.json())
      .then((j) => alive && (j.text ? setText(j.text) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [seen, id, lang, pair]);

  return (
    <p ref={ref} className={`say ${text ? "" : "muted"}`} aria-live="polite" lang={lang}>
      {text ? shown : failed ? words.lost : words.reading}
    </p>
  );
}
