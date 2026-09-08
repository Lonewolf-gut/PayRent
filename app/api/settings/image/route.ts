import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { saveProfileImage } from "@/lib/integrations/documents";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { withProfileImageVersion } from "@/lib/utils/profile-image";
import { validateUploadFile } from "@/lib/storage/validation";
import { getMaxUploadBytes } from "@/lib/storage/config";

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return apiResponse({ error: "Image file is required." }, 400);
  }

  try {
    validateUploadFile(file, { kind: "image", maxBytes: getMaxUploadBytes() });
  } catch (error) {
    return apiResponse(
      { error: error instanceof Error ? error.message : "Invalid image file." },
      400
    );
  }

  const imageUrl = await saveProfileImage(file, session.user.id);
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
    select: { updatedAt: true },
  });

  return apiResponse({
    imageUrl: withProfileImageVersion(imageUrl, user.updatedAt),
  });
});
