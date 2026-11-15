import type { Metadata, Viewport } from "next";
import { Geologica, Martian_Mono, Unbounded } from "next/font/google";
import Starfield from "@/components/Starfield";
import Deck from "@/components/Deck";
import Haptics from "@/components/Haptics";
import { CARD, DESCRIPTION, OPEN_GRAPH, SITE, X } from "@/lib/share";
import "./globals.css";

const display = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-display" });
const body = Geologica({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const mono = Martian_Mono({ subsets: ["latin", "cyrillic"], axes: ["wdth"], variable: "--font-mono" });

// Every page of the app shares as the app's card unless it sets its own (a traveler's card shows their Kin)
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "The Future 2050",
  description: DESCRIPTION,
  openGraph: { ...OPEN_GRAPH, title: "The Future 2050", description: DESCRIPTION, images: [CARD] },
  twitter: { card: "summary_large_image", site: X, title: "The Future 2050", description: DESCRIPTION, images: [CARD] },
};
export const viewport: Viewport = { themeColor: "#030817", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Starfield />
        {children}
        <Deck />
        <Haptics />
      </body>
    </html>
  );
}
