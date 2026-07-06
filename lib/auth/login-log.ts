import { headers } from "next/headers";
import { auditService } from "@/lib/services/audit.service";

export async function getLoginRequestMeta() {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    undefined;
  const userAgent = headerList.get("user-agent") ?? undefined;

  return { ip, userAgent };
}

export async function logLoginAttempt(userId: string, success: boolean) {
  try {
    const { ip, userAgent } = await getLoginRequestMeta();
    await auditService.logLogin(userId, success, ip, userAgent);
  } catch {
    // Never block authentication when audit logging fails.
  }
}
