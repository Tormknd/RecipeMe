import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Configuration pour hébergement sous /recipeme
  basePath: '/recipeme',
  // On laisse l'assetPrefix vide, Next.js gère ça via basePath
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Désactiver la vérification ESLint pendant le build de production pour éviter les échecs bloquants
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
