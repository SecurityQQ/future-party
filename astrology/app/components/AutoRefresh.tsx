"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetch the server page every few seconds (live ranking on a wall screen).
export default function AutoRefresh({ every = 15000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
