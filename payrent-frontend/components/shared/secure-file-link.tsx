"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SecureFileAccessRequest =
  | { scope: "kyc"; documentId: string }
  | { scope: "financing"; documentId: string }
  | { scope: "application"; documentId: string }
  | { scope: "mandate"; mandateId: string }
  | { scope: "property-document"; fileKey: string };

type SecureFileLinkProps = {
  request: SecureFileAccessRequest;
  children: React.ReactNode;
  className?: string;
  download?: boolean;
  onUrl?: (url: string) => void;
};

async function fetchSecureFileUrl(request: SecureFileAccessRequest) {
  const res = await fetch("/api/files/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? "Unable to open file.");
  }
  return json.data.url as string;
}

export function SecureFileLink({
  request,
  children,
  className,
  download,
  onUrl,
}: SecureFileLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const url = await fetchSecureFileUrl(request);
      onUrl?.(url);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "";
        anchor.rel = "noreferrer";
        anchor.target = "_blank";
        anchor.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <a
      href="#"
      onClick={handleClick}
      className={cn(className, loading && "pointer-events-none opacity-60")}
    >
      {children}
    </a>
  );
}

export function useSecureFileUrl() {
  const [loading, setLoading] = useState(false);

  async function openFile(request: SecureFileAccessRequest) {
    setLoading(true);
    try {
      const url = await fetchSecureFileUrl(request);
      return url;
    } finally {
      setLoading(false);
    }
  }

  return { openFile, loading };
}
