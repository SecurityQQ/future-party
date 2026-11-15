"use client";
import { useEffect, useRef, useState } from "react";
import { useTypewriter } from "./useTypewriter";

// Fable's reading of one traveler, fetched when it scrolls into view (the first time, Fable writes it).
export default function FableReading({ id, big = false }: { id: string; big?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState(big);
  const { shown } = useTypewriter(text, big ? 60 : 120);

  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    let alive = true;
    fetch(`/api/fable/${id}`)
      .then((r) => r.json())
      .then((j) => alive && (j.text ? setText(j.text) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [seen, id]);

  return (
    <p ref={ref} className={`say ${text ? "" : "muted"}`} aria-live="polite">
      {text ? shown : failed ? "Fable lost the signal. Look again in a minute." : "Fable is reading…"}
    </p>
  );
}
