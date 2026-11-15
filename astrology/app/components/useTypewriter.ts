"use client";
import { useEffect, useState } from "react";

// Reveal text a few characters at a time, like a comm terminal.
export function useTypewriter(text: string, cps = 45) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(text.length);
    const step = Math.max(1, Math.round(cps / 20));
    const t = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(t), x) : x + step)), 50);
    return () => clearInterval(t);
  }, [text, cps]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}
