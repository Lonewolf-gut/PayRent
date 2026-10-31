import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readPublicStoredFile } from "@/lib/storage/index";
import { resolvePublicStorageKeyFromRequest } from "@/lib/utils/property-media";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

/** Serve public uploads (property images, profile photos) without auth. */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get("path");
  const keyParam = req.nextUrl.searchParams.get("key");
  const refParam = req.nextUrl.searchParams.get("ref");

  const storageKey = resolvePublicStorageKeyFromRequest(pathParam, keyParam, refParam);
  if (!storageKey) {
    return NextResponse.json({ error: "Invalid public file request." }, { status: 400 });
  }

  try {
    const { body, contentType } = await readPublicStoredFile(storageKey);
    const ext = path.extname(storageKey).toLowerCase();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
