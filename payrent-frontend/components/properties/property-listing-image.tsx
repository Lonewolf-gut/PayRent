"use client";

import { useState } from "react";
import { resolveAssetUrl } from "@/lib/utils/asset-url";
import { cn } from "@/lib/utils";

export type ListingImageRecord = {
  id?: string;
  url: string;
  alt?: string | null;
  displayUrl?: string | null;
  src?: string | null;
};

type PropertyListingImageProps = {
  alt: string;
  className?: string;
  priority?: boolean;
} & (
  | { url: string | null | undefined; image?: never }
  | { image: ListingImageRecord; url?: never }
);

function pickImageReference(image: ListingImageRecord): string {
  return image.src ?? image.displayUrl ?? image.url ?? "";
}

export function PropertyListingImage(props: PropertyListingImageProps) {
  const { alt, className, priority = false } = props;
  const rawUrl = "image" in props && props.image ? pickImageReference(props.image) : props.url;
  const primary = resolveAssetUrl(rawUrl);
  const fallbackRaw =
    "image" in props && props.image
      ? props.image.url !== rawUrl
        ? props.image.url
        : props.image.displayUrl ?? props.image.src ?? ""
      : "";
  const fallback = resolveAssetUrl(fallbackRaw);
  const [useFallback, setUseFallback] = useState(false);

  const src = useFallback && fallback && fallback !== primary ? fallback : primary;
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
      onError={() => {
        if (!useFallback && fallback && fallback !== primary) {
          setUseFallback(true);
        }
      }}
    />
  );
}
