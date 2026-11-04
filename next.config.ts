import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["firebase-admin"],
  experimental: {
    inlineCss: process.env.NODE_ENV === "production",
  },
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "next/dist/compiled/next-devtools": false,
        "next/dist/next-devtools/userspace/app/app-dev-overlay-setup": false,
        "next/dist/build/polyfills/polyfill-module": false,
      };
    }
    return config;
  },
};

export default nextConfig;
