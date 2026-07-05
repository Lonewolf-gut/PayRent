import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { withProfileImageVersion } from "@/lib/utils/profile-image";

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return apiResponse({ error: "Image file is required." }, 400);
  }

  const contentType = file.type;
  if (!contentType.startsWith("image/")) {
    return apiResponse({ error: "Only image files are allowed." }, 400);
  }

  const extension = contentType.split("/").pop() ?? "jpg";
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${session.user.id}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(filePath, buffer);

  const existingFiles = await fs.readdir(uploadDir);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`${session.user.id}.`) && name !== fileName)
      .map((name) => fs.unlink(path.join(uploadDir, name)).catch(() => undefined))
  );

  const imageUrl = `/uploads/profiles/${fileName}`;
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
    select: { updatedAt: true },
  });

  return apiResponse({
    imageUrl: withProfileImageVersion(imageUrl, user.updatedAt),
  });
});
