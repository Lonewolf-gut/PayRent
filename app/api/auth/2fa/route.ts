import { NextRequest } from "next/server";
import { z } from "zod";
import { twoFactorService } from "@/lib/services/two-factor.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const schema = z.object({
    action: z.enum(["enable", "verify"]),
    token: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  if (parsed.data.action === "enable") {
    const result = await twoFactorService.enable(session.user.id, session.user.email);
    return apiResponse(result);
  }

  if (!parsed.data.token) return apiResponse({ error: "Token required" }, 400);
  await twoFactorService.verify(session.user.id, parsed.data.token);
  return apiResponse({ enabled: true });
});
