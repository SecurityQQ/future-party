import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

// The address this request came in on (the production alias, a preview, or localhost).
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "zodiac-rangers.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

// The short public link to a traveler's card: /c/<card number>.
export function cardUrl(origin: string, cardNo: number): string {
  return `${origin}/c/${cardNo}`;
}

// A QR code as an SVG string: dark modules on white, which every phone camera reads.
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#03050c", light: "#ffffff" } });
}
