"use client";

import { resolveAssetUrl } from "@/lib/utils/asset-url";
import { cn } from "@/lib/utils";

type PropertyListingImageProps = {
  url: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function PropertyListingImage({
  url,
  alt,
  className,
  priority = false,
}: PropertyListingImageProps) {
  const src = resolveAssetUrl(url);
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
