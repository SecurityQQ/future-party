import type { NextConfig } from "next";

// One site at vargafutureparty.com. The party's front page and every page it links are static files that
// `npm run site` writes into public/ from the repo (hub/site.py); the app lives under /app, its API under /api.
const MAIN = "https://vargafutureparty.com";
// The app's first addresses: the NFC passes were written as zodiac-rangers.vercel.app/t/<code>.
const oldHost = [{ type: "host" as const, value: "(?:zodiac-rangers|the-future-2050)\\.vercel\\.app" }];
// A phone with a traveler on an old address keeps its session there; every other phone moves to the main address.
const noSession = [{ type: "cookie" as const, key: "zr_session" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  turbopack: { root: process.cwd() },
  redirects: async () => [
    { source: "/t/:code", has: oldHost, missing: noSession, destination: `${MAIN}/app/t/:code`, permanent: false },
    { source: "/", has: oldHost, missing: noSession, destination: `${MAIN}/app`, permanent: false },
    { source: "/mirror", has: oldHost, missing: noSession, destination: `${MAIN}/app/mirror`, permanent: false },
    { source: "/:path((?!api/|_next/).+)", has: oldHost, missing: noSession, destination: `${MAIN}/:path`, permanent: false },
    // On the old addresses / and /mirror were the app's; on the main address they are the party's front page and Mirror 2050
    { source: "/", has: oldHost, destination: "/app", permanent: false },
    { source: "/mirror", has: oldHost, destination: "/app/mirror", permanent: false },
    // The app's pages before they moved under /app: passes, shared cards, the links in welcome emails
    { source: "/:page(t|c|me|login|scan|leaderboard)/:rest*", destination: "/app/:page/:rest*", permanent: false },
    // /admin is the host's page; /admin?key=<ADMIN_KEY> was the app's admin
    { source: "/admin", has: [{ type: "query", key: "key" }], destination: "/app/admin", permanent: false },
  ],
  rewrites: async () => ({
    beforeFiles: [],
    afterFiles: [{ source: "/", destination: "/index.html" }],
    // A folder answers with its index.html: the short addresses (/wall, /quotes ...), /admin, and the app's /app/mirror
    fallback: [{ source: "/:path+", destination: "/:path+/index.html" }],
  }),
};

export default nextConfig;
