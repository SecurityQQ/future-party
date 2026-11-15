import type { Metadata, Viewport } from "next";
import { Geologica, Martian_Mono, Unbounded } from "next/font/google";
import Starfield from "@/components/Starfield";
import Deck from "@/components/Deck";
import "./globals.css";

const display = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-display" });
const body = Geologica({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const mono = Martian_Mono({ subsets: ["latin", "cyrillic"], axes: ["wdth"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Kin 2050 · The Future Party",
  description: "It is 2050 and nobody arrives alone. Tap your pass, meet your Kin, and collect the Kin of everyone you meet at The Future Party.",
};
export const viewport: Viewport = { themeColor: "#03050c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Starfield />
        {children}
        <Deck />
      </body>
    </html>
  );
}
