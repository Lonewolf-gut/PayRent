import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readLocalFile, verifyLocalAccessToken } from "@/lib/storage/local-storage";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const token = req.nextUrl.searchParams.get("token");

  if (!key || !token || !key.startsWith("private/")) {
    return NextResponse.json({ error: "Invalid file request." }, { status: 400 });
  }

  if (!verifyLocalAccessToken(key, token)) {
    return NextResponse.json({ error: "Access link expired or invalid." }, { status: 403 });
  }

  try {
    const body = await readLocalFile(key);
    const ext = path.extname(key).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
