import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' ? '/recipeMe' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/recipeMe' : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

