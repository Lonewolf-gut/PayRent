"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const LIGHT_TOAST_VARS = {
  "--normal-bg": "oklch(1 0 0)",
  "--normal-text": "oklch(0.32 0.08 160)",
  "--normal-border": "oklch(0.9 0.03 156)",
  "--success-bg": "oklch(1 0 0)",
  "--success-text": "oklch(0.32 0.08 160)",
  "--success-border": "oklch(0.9 0.03 156)",
  "--error-bg": "oklch(1 0 0)",
  "--error-text": "oklch(0.32 0.08 160)",
  "--error-border": "oklch(0.9 0.03 156)",
  "--warning-bg": "oklch(1 0 0)",
  "--warning-text": "oklch(0.32 0.08 160)",
  "--warning-border": "oklch(0.9 0.03 156)",
  "--info-bg": "oklch(1 0 0)",
  "--info-text": "oklch(0.32 0.08 160)",
  "--info-border": "oklch(0.9 0.03 156)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={LIGHT_TOAST_VARS}
      toastOptions={{
        classNames: {
          toast: "cn-toast !bg-white !text-slate-800 !border-slate-200 shadow-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
