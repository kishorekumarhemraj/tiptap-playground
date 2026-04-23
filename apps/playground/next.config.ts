import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The editor is a workspace package distributed as TypeScript source,
  // so Next has to compile it alongside the app.
  transpilePackages: ["@tiptap-playground/editor"],
};

export default nextConfig;
