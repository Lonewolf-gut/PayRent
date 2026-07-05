import type { NextConfig } from "next";

const isProductionBuild = process.env.npm_lifecycle_event === "build";

const nextConfig: NextConfig = {
  // Must stay relative — Next.js joins distDir with the project root.
  distDir: isProductionBuild ? ".next" : ".next-dev",
  ...(isProductionBuild ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
