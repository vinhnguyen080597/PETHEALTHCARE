import type { NextConfig } from "next";
import { listingMaxRequestBodyConfig } from "./src/lib/listingFormOptions";

const listingUploadBodyLimit = listingMaxRequestBodyConfig();

const nextConfig: NextConfig = {
  // Soft-nav revisit: reuse RSC payload briefly so loading.tsx does not flash every click.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Listing create uploads each file separately; limit covers single video (50MB) + headroom.
    middlewareClientMaxBodySize: listingUploadBodyLimit,
    proxyClientMaxBodySize: listingUploadBodyLimit,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
    ];
  },
};

export default nextConfig;
