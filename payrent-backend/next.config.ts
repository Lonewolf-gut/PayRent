import type { NextConfig } from "next";

const lifecycle = process.env.npm_lifecycle_event;
const isProductionDist = lifecycle === "build" || lifecycle === "start";
const frontendOrigin =
  process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  distDir: isProductionDist ? ".next" : ".next-dev",
  ...(isProductionDist ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: frontendOrigin },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-bank-api-key, x-bank-signature",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
