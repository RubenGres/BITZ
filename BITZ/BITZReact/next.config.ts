import type { NextConfig } from "next";

const nextConfig = {
  output: 'standalone',

  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
