import { promises as fs } from "fs";
import path from "path";
import { getSignedUrlTtlSeconds } from "@/lib/storage/config";

const PRIVATE_ROOT = path.join(process.cwd(), "storage", "private");
const PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads");

function resolvePrivatePath(storageKey: string) {
  if (!storageKey.startsWith("private/")) {
    throw new Error("Expected a private storage key.");
  }
  const relative = storageKey.replace(/^private\//, "");
  const absolute = path.join(PRIVATE_ROOT, relative);
  const resolvedRoot = path.resolve(PRIVATE_ROOT);
  const resolvedPath = path.resolve(absolute);
  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("Invalid storage path.");
  }
  return resolvedPath;
}

function resolvePublicPath(storageKey: string) {
  if (!storageKey.startsWith("public/")) {
    throw new Error("Expected a public storage key.");
  }
  const relative = storageKey.replace(/^public\//, "");
  const absolute = path.join(PUBLIC_ROOT, relative);
  const resolvedRoot = path.resolve(PUBLIC_ROOT);
  const resolvedPath = path.resolve(absolute);
  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("Invalid storage path.");
  }
  return resolvedPath;
}

export async function uploadToLocal(params: {
  key: string;
  body: Buffer;
}) {
  const filePath = params.key.startsWith("private/")
    ? resolvePrivatePath(params.key)
    : resolvePublicPath(params.key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, params.body);
}

export async function deleteFromLocal(key: string) {
  const filePath = key.startsWith("private/")
    ? resolvePrivatePath(key)
    : resolvePublicPath(key);
  await fs.unlink(filePath).catch(() => undefined);
}

export function createLocalAccessToken(key: string) {
  const expiresAt = Date.now() + getSignedUrlTtlSeconds() * 1000;
  const payload = `${key}:${expiresAt}`;
  const signature = Buffer.from(payload).toString("base64url");
  return `${signature}.${expiresAt}`;
}

export function verifyLocalAccessToken(key: string, token: string) {
  const [encoded, expiresAtRaw] = token.split(".");
  if (!encoded || !expiresAtRaw) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const payload = `${key}:${expiresAt}`;
  return Buffer.from(payload).toString("base64url") === encoded;
}

export async function readLocalFile(key: string) {
  const filePath = key.startsWith("private/")
    ? resolvePrivatePath(key)
    : resolvePublicPath(key);
  return fs.readFile(filePath);
}

export function getLocalPublicUrl(key: string) {
  if (!key.startsWith("public/")) return null;
  const relative = key.replace(/^public\//, "");
  return `/uploads/${relative}`;
}
