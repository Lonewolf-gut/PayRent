async function saveUploadedFile(
  file: File,
  subdir: "applications" | "financing-docs" | "kyc"
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { randomUUID } = await import("crypto");
  const extension = path.extname(file.name) || ".pdf";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", subdir);
  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${subdir}/${fileName}`;
}

export async function saveApplicationDocument(file: File): Promise<string> {
  return saveUploadedFile(file, "applications");
}

export async function saveFinancingDocument(file: File): Promise<string> {
  return saveUploadedFile(file, "financing-docs");
}

export async function saveKycDocument(file: File): Promise<string> {
  return saveUploadedFile(file, "kyc");
}
