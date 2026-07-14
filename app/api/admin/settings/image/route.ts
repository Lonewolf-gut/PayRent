import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { saveProfileImage } from "@/lib/integrations/documents";

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return apiResponse({ error: "Image file is required." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return apiResponse({ error: "Only image files are allowed." }, 400);
    }

    const imageUrl = await saveProfileImage(session.user.id, file);
    await prisma.user.update({ where: { id: session.user.id }, data: { image: imageUrl } });

    return apiResponse({ imageUrl });
  },
  { roles: ["ADMIN"] }
);
