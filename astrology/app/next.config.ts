import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  turbopack: { root: process.cwd() },
  // The mirror is a full-screen camera page outside the React shell: public/mirror/index.html.
  rewrites: async () => [{ source: "/mirror", destination: "/mirror/index.html" }],
};

export default nextConfig;
