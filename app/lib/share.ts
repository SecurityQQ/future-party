// What a shared link to the app shows in messengers and social networks. The party site's pages get theirs from
// hub/seo.py; the card is hub/og/app.jpg (hub/og/make.py), which hub/site.py puts at /og-app.jpg.
export const SITE = "https://www.vargafutureparty.com";
export const DESCRIPTION =
  "It is 2050 and nobody arrives alone. Tap your pass, meet your Kin, and collect the Kin of everyone you meet at The Future Party.";
export const CARD = { url: "/og-app.jpg", width: 1200, height: 630, alt: "The Future 2050: the future is who you meet" };
export const OPEN_GRAPH = { type: "website", siteName: "Future Party 2050", locale: "en_US" } as const;
