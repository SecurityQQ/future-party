"use client";
import { useEffect } from "react";
import { haptic, type HapticKind } from "@/lib/haptics";

const TARGET = "[data-haptic], .btn, .deck a, button, summary";

// Every tap on a button, a deck knob or anything with data-haptic gets a click from the phone. The
// tick runs inside the tap itself (capture phase, before the page's own handler), which is the only
// moment iPhone Safari lets a page reach the Taptic Engine. data-haptic picks the rhythm
// (lib/haptics.ts): "kin" when someone joins your orbit, "success" for a done step, "off" for none.
export default function Haptics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted) return; // our own hidden switch, or a script's click
      const el = (e.target as Element | null)?.closest?.(TARGET) as HTMLElement | null;
      if (!el || el.closest("head")) return;
      const kind = (el.dataset.haptic || (el.closest(".deck") ? "select" : "tap")) as HapticKind | "off";
      if (kind !== "off") haptic(kind);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
