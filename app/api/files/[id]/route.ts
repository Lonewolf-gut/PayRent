import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fileStorageService } from "@/lib/services/file-storage.service";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const file = await fileStorageService.getById(id);
  if (!file) {
    return serveLegacyDiskPath(id);
  }

  const session = await auth();
  const allowed = await fileStorageService.canAccess(file, session);
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const cacheControl =
    file.category === "PROPERTY" || file.category === "PROFILE"
      ? "public, max-age=3600"
      : "private, max-age=3600";

  return new Response(file.data, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
      "Cache-Control": cacheControl,
    },
  });
}

async function serveLegacyDiskPath(relativePath: string) {
  if (relativePath.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  const diskPath = path.join(process.cwd(), "public", "uploads", relativePath);
  try {
    const buffer = await fs.readFile(diskPath);
    const ext = path.extname(relativePath).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "application/octet-stream";

    return new Response(buffer, {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
