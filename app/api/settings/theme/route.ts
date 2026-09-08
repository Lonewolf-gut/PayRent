import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

const themeSchema = z.object({
  theme: z.enum(["light", "dark"]),
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const parsed = themeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiResponse({ error: "Theme must be light or dark" }, 400);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardTheme: parsed.data.theme },
  });

  return apiResponse({ theme: parsed.data.theme });
});
