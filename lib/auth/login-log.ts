import { headers } from "next/headers";
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
    await auditService.logLogin(
      userId,
      success,
      meta.ip,
      meta.userAgent,
      email
    );
  } catch {
    // Never block authentication when audit logging fails.
  }
}
