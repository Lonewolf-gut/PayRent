"use client";

import { Check } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FINANCING_FLOW_STEPS } from "@/lib/financing/status-flow";
import { cn } from "@/lib/utils";

export function FinancingFlowCarousel({
  activeStep,
  className,
}: {
  activeStep: number;
  className?: string;
}) {
  return (
    <div className={cn("relative px-10", className)}>
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-2">
          {FINANCING_FLOW_STEPS.map((step) => {
            const isComplete = activeStep > step.id;
            const isCurrent = activeStep === step.id;

            return (
              <CarouselItem key={step.id} className="basis-full sm:basis-1/2 lg:basis-1/4 pl-2">
                <div
                  className={cn(
                    "h-full rounded-xl border p-4",
                    isCurrent
                      ? "border-amber-500/50 bg-amber-500/10"
                      : isComplete
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isComplete || isCurrent
                          ? "bg-amber-500 text-white"
                          : "border border-border bg-background text-muted-foreground"
                      )}
                    >
                      {isComplete ? <Check className="size-4" /> : step.id}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
                  {isCurrent ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Current step
                    </p>
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-2" />
        <CarouselNext className="-right-2" />
      </Carousel>
    </div>
  );
}
