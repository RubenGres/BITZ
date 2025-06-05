import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
 dest: 'public',
 register: true,
 skipWaiting: true,
 disable: process.env.NODE_ENV === 'development'
});

const nextConfig: NextConfig = {
 output: 'standalone',

 // Ignore ESLint errors during build
 eslint: {
   ignoreDuringBuilds: true,
 },
 
 // Ignore TypeScript errors during build
 typescript: {
   ignoreBuildErrors: true,
 },

 env: {
   NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
 }
};

export default withPWA(nextConfig);