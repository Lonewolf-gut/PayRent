import type { NextConfig } from "next";
import path from "node:path";

const distDir = process.env.NEXT_DIST_DIR ?? ".next";
const useStandaloneOutput = process.env.STANDALONE_BUILD === "1";
const frontendOrigin =
  process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  distDir,
  outputFileTracingRoot: path.join(__dirname),
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
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
