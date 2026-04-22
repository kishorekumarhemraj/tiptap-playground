import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Turbopack is wired via the `--turbopack` flag in package.json scripts.
    // Additional Turbopack rules go here when we need custom loaders.
  },
};

export default nextConfig;
