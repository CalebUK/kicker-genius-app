import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Kicker photos come from NFL.com at full size (~290 KB each, shown at 48px);
    // Next serves small WebP copies sized for the screen instead.
    remotePatterns: [{ protocol: "https", hostname: "static.www.nfl.com" }],
    formats: ["image/webp"],
    // photos rarely change: keep the resized copies for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
