import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/errors";
import type { UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import type { Session } from "next-auth";

export type RouteContext = { params: Promise<Record<string, string>> };

export type AppSession = Session & {
  user: {
    id: string;
    email: string;
    role: UserRole;
    image?: string | null;
    twoFactorEnabled: boolean;
  };
};

export function apiResponse<T>(
  data: T,
  status = 200,
  message = "Request completed successfully."
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      errors: null,
      requestId: randomUUID(),
    },
    { status }
  );
}

export function apiError(error: unknown) {
  const { message, statusCode, code } = handleApiError(error);
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      errors: [{ code, message }],
      requestId: randomUUID(),
    },
    { status: statusCode }
  );
}

export function withAuth(
  handler: (
    req: NextRequest,
    context: RouteContext,
    session: AppSession
  ) => Promise<NextResponse>,
  options?: { permission?: string; roles?: UserRole[] }
) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const { success, remaining } = await rateLimit(`${ip}:${req.nextUrl.pathname}`);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { message: "Too many requests", code: "RATE_LIMIT" } },
          { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
        );
      }

      const session = await auth();
      if (!session?.user?.id || !session.user.email) {
        return NextResponse.json(
          { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
          { status: 401 }
        );
      }

      const appSession = session as AppSession;

      if (options?.roles && !options.roles.includes(appSession.user.role)) {
        return NextResponse.json(
          { success: false, error: { message: "Forbidden", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }

      if (
        options?.permission &&
        !hasPermission(appSession.user.role, options.permission)
      ) {
        return NextResponse.json(
          { success: false, error: { message: "Forbidden", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }

      return handler(req, context, appSession);
    } catch (error) {
      return apiError(error);
    }
  };
}

export function withPublicHandler(
  handler: (req: NextRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      const { success } = await rateLimit(`${ip}:${req.nextUrl.pathname}`);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { message: "Too many requests" } },
          { status: 429 }
        );
      }
      return handler(req, context);
    } catch (error) {
      return apiError(error);
    }
  };
}
