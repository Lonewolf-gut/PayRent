import type { NextConfig } from "next";

const isProductionBuild = process.env.npm_lifecycle_event === "build";

const nextConfig: NextConfig = {
  distDir: isProductionBuild ? ".next" : ".next-dev",
  ...(isProductionBuild ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async redirects() {
    return [
      { source: "/dashboard/tenant/:path*", destination: "/dashboard/buyer/:path*", permanent: true },
      { source: "/dashboard/landlord/:path*", destination: "/dashboard/merchant/:path*", permanent: true },
      { source: "/dashboard/agent/:path*", destination: "/dashboard/marketer/:path*", permanent: true },
    ];
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
