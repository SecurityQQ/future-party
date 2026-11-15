// Haptics: the phone answers a touch with a small physical click.
//
// - Android (Chrome): the Vibration API, with a pattern for each kind of moment.
// - iPhone: Safari has no Vibration API. Its only door to the Taptic Engine is the native switch
//   (<input type="checkbox" switch>, Safari 17.4+), which ticks when it is toggled. We toggle a hidden
//   one through its label. Since iOS 26.5 Safari ticks only while a real tap is being handled, so call
//   haptic() synchronously inside a click handler (components/Haptics.tsx does that for every button).
//   Later ticks of a pattern and calls after a fetch are best effort: on iPhone the first tick of a
//   tap always lands, the rest may be dropped; on Android every one plays.
// - Elsewhere (desktop, mouse): nothing.
//
// A tick on iPhone is always the same light click, so the kinds differ by rhythm there; on Android
// they also differ by strength (length of the pulse).

export type HapticKind = "tap" | "select" | "success" | "kin" | "land" | "error";

// Android: [vibrate, pause, vibrate, …] in ms.
const VIBRATE: Record<HapticKind, number[]> = {
  tap: [8],
  select: [5],
  success: [12, 70, 20],
  kin: [10, 45, 10, 45, 14, 220, 34], // a quick ripple, then the Kin lands
  land: [26],
  error: [28, 60, 28, 60, 28],
};

// iPhone: when each tick fires, in ms from the tap.
const TICKS: Record<HapticKind, number[]> = {
  tap: [0],
  select: [0],
  success: [0, 90],
  kin: [0, 55, 110, 330],
  land: [0],
  error: [0, 80, 160],
};

let mode: "vibrate" | "switch" | "none" | undefined;

function detect(): typeof mode {
  if (typeof window === "undefined") return "none";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (!coarse) return "none";
  if (typeof navigator.vibrate === "function") return "vibrate";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "switch" : "none";
}

function tick() {
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

export function haptic(kind: HapticKind = "tap") {
  try {
    mode ??= detect();
    if (mode === "vibrate") navigator.vibrate(VIBRATE[kind]);
    else if (mode === "switch")
      for (const at of TICKS[kind]) at === 0 ? tick() : setTimeout(tick, at);
  } catch {
    // A phone that refuses is fine: haptics are a garnish, never a step.
  }
}
