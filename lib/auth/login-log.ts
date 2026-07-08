import { headers } from "next/headers";
import { recordFailedLoginAttempt } from "@/lib/admin/failed-login-stats";
import { auditService } from "@/lib/services/audit.service";

export type LoginRequestMeta = {
  ip?: string;
  userAgent?: string;
};

export function getLoginMetaFromRequest(request?: Request): LoginRequestMeta {
  if (!request) return {};

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  return { ip, userAgent };
}

export async function getLoginRequestMeta(): Promise<LoginRequestMeta> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    undefined;
  const userAgent = headerList.get("user-agent") ?? undefined;

  return { ip, userAgent };
}

export async function logLoginAttempt(
  userId: string | null,
  success: boolean,
  email?: string,
  request?: Request
) {
  let meta: LoginRequestMeta = {};

  if (request) {
    meta = getLoginMetaFromRequest(request);
  } else {
    try {
      meta = await getLoginRequestMeta();
    } catch {
      // headers() is unavailable outside a request context.
    }
  }

  try {
    if (success) {
      await auditService.logLogin(
        userId,
        true,
        meta.ip,
        meta.userAgent,
        email
      );
      return;
    }

    const logged = await recordFailedLoginAttempt({
      userId,
      email,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });

    if (!logged) {
      await auditService.logLogin(
        userId,
        false,
        meta.ip,
        meta.userAgent,
        email
      );
    }
  } catch {
    // Never block authentication when audit logging fails.
  }
}
