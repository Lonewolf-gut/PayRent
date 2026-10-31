import type { NextConfig } from "next";
import { resolveBackendApiOrigin, warnMisconfiguredBackendUrl } from "@/lib/api/resolve-backend-url";

const lifecycle = process.env.npm_lifecycle_event ?? "";
const isDevServer = lifecycle === "dev" || lifecycle === "dev:turbo";
const useStandaloneOutput = process.env.STANDALONE_BUILD === "1";
const isWindowsDev = process.platform === "win32" && isDevServer;
const turboFsCacheEnabled = process.env.TURBOPACK_FS_CACHE === "1";
warnMisconfiguredBackendUrl();
const apiOrigin = resolveBackendApiOrigin();

const nextConfig: NextConfig = {
  distDir: isDevServer ? ".next-dev" : ".next",
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.S3_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.S3_PUBLIC_URL).hostname }]
        : []),
    ],
  },
  async rewrites() {
    const backendAuthRoutes = [
      "2fa",
      "2fa/request",
      "forgot-password",
      "login",
      "login-attempt",
      "refresh",
      "register",
      "resend-phone-verification",
      "resend-verification",
      "reset-password",
    ];

    return {
      beforeFiles: backendAuthRoutes.map((path) => ({
        source: `/api/auth/${path}`,
        destination: `${apiOrigin}/api/auth/${path}`,
      })),
      afterFiles: [
        {
          // Keep Auth.js session/sign-out on the frontend; proxy everything else to the API.
          source:
            "/api/:path((?!auth/signout|auth/session|auth/csrf|auth/providers|auth/callback).*)",
          destination: `${apiOrigin}/api/:path`,
        },
      ],
    };
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
    ...(isWindowsDev && !turboFsCacheEnabled
      ? { turbopackFileSystemCacheForDev: false }
      : {}),
  },
};

export default nextConfig;
