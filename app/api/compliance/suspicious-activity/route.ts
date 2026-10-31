import { detectSuspiciousActivity } from "@/lib/compliance/suspicious-activity.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const flags = await detectSuspiciousActivity();
    return apiResponse({ flags, total: flags.length });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:monitor" }
);
