"use client";

import { useEffect, useState } from "react";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import { toast } from "sonner";

type SecureDocumentPreviewProps = {
  documentId: string;
  fileName: string;
  label: string;
  scope: "kyc" | "financing" | "application";
};

async function fetchSecureFileUrl(
  scope: SecureDocumentPreviewProps["scope"],
  documentId: string
) {
  const res = await fetch("/api/files/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, documentId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? "Unable to load file.");
  }
  return json.data.url as string;
}

export function SecureDocumentPreview({
  documentId,
  fileName,
  label,
  scope,
}: SecureDocumentPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  useEffect(() => {
    let active = true;
    fetchSecureFileUrl(scope, documentId)
      .then((nextUrl) => {
        if (active) setUrl(nextUrl);
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Unable to load document.");
        }
      });

    return () => {
      active = false;
    };
  }, [documentId, scope]);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{label}</p>
      {!url ? (
        <p className="text-sm text-muted-foreground">Loading secure preview…</p>
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="max-h-48 rounded-md border object-contain" />
      ) : isPdf ? (
        <iframe src={url} title={label} className="h-48 w-full rounded-md border bg-muted/20" />
      ) : null}
      <div className="flex flex-wrap gap-3">
        <SecureFileLink
          request={{ scope, documentId }}
          className="text-sm text-emerald-600 hover:underline"
        >
          Preview {fileName}
        </SecureFileLink>
        <SecureFileLink
          request={{ scope, documentId }}
          download
          className="text-sm text-emerald-600 hover:underline"
        >
          Download
        </SecureFileLink>
      </div>
    </div>
  );
}
