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
  propertyName,
  statusLabel,
}: {
  activeStep: number;
  className?: string;
  propertyName?: string;
  statusLabel?: string;
}) {
  const currentStep = FINANCING_FLOW_STEPS.find((step) => step.id === activeStep);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Pay-for-me progress</p>
          {propertyName ? (
            <p className="text-xs text-muted-foreground">
              For <span className="font-medium text-foreground">{propertyName}</span>
            </p>
          ) : null}
        </div>
        {statusLabel ? (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{statusLabel}</p>
        ) : currentStep ? (
          <p className="text-xs text-muted-foreground">
            Step {activeStep} of {FINANCING_FLOW_STEPS.length}: {currentStep.title}
          </p>
        ) : null}
      </div>
    <div className={cn("relative px-10")}>
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
    </div>
  );
}
