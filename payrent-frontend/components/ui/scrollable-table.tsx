import { cn } from "@/lib/utils";

export function ScrollableTable({
  children,
  className,
  maxHeightClass = "max-h-[min(70vh,560px)]",
}: {
  children: React.ReactNode;
  className?: string;
  maxHeightClass?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto overflow-y-auto rounded-none border border-border",
        maxHeightClass,
        className
      )}
    >
      {children}
    </div>
  );
}
