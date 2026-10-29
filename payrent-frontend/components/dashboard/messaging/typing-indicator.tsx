"use client";

import { cn } from "@/lib/utils";

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${index * 150}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

export function TypingIndicator({
  displayName,
  align = "start",
}: {
  displayName?: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start"
      )}
      role="status"
      aria-live="polite"
      aria-label={displayName ? `${displayName} is typing` : "Someone is typing"}
    >
      <div className="max-w-[60%] w-fit rounded-2xl bg-muted px-4 py-3">
        <TypingDots />
      </div>
    </div>
  );
}
