"use client";

import { getPasswordRequirementStatus } from "@/lib/validations/password-requirements";
import { cn } from "@/lib/utils";

type PasswordRequirementsChecklistProps = {
  password: string;
};

export function PasswordRequirementsChecklist({ password }: PasswordRequirementsChecklistProps) {
  if (!password) return null;

  const requirements = getPasswordRequirementStatus(password);

  return (
    <ul className="space-y-1.5" aria-live="polite" aria-label="Password requirements">
      {requirements.map(({ id, label, met }) => (
        <li key={id} className="flex items-center gap-2.5 text-sm">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full transition-colors",
              met ? "bg-emerald-600" : "bg-slate-300"
            )}
          />
          <span
            className={cn(
              "transition-colors",
              met ? "font-medium text-emerald-600" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
