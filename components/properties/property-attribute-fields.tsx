"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getAttributeFieldsForType,
  type PropertyAttributes,
} from "@/lib/constants/property-listing";
import type { PropertyType } from "@prisma/client";

type Props = {
  propertyType: PropertyType;
  attributes: PropertyAttributes;
  onChange: (attributes: PropertyAttributes) => void;
  disabled?: boolean;
  surveyPlanFile?: File | null;
  onSurveyPlanChange?: (file: File | null) => void;
  existingSurveyPlanUrl?: string | null;
};

export function PropertyAttributeFields({
  propertyType,
  attributes,
  onChange,
  disabled,
  surveyPlanFile,
  onSurveyPlanChange,
  existingSurveyPlanUrl,
}: Props) {
  const fields = getAttributeFieldsForType(propertyType);

  function setValue(key: string, value: string | number | boolean | string[]) {
    onChange({ ...attributes, [key]: value });
  }

  function toggleMultiselect(key: string, option: string) {
    const current = Array.isArray(attributes[key])
      ? (attributes[key] as string[])
      : [];
    if (current.includes(option)) {
      setValue(
        key,
        current.filter((o) => o !== option)
      );
    } else {
      setValue(key, [...current, option]);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        if (field.type === "file") {
          return (
            <div key={field.key} className="space-y-2 sm:col-span-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                disabled={disabled}
                onChange={(e) =>
                  onSurveyPlanChange?.(e.target.files?.[0] ?? null)
                }
              />
              {existingSurveyPlanUrl && !surveyPlanFile ? (
                <p className="text-xs text-muted-foreground">
                  Current survey plan on file. Upload a new file to replace it.
                </p>
              ) : null}
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <div
              key={field.key}
              className="flex items-center gap-2 rounded-md border p-3"
            >
              <input
                id={field.key}
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
                checked={attributes[field.key] === true}
                disabled={disabled}
                onChange={(e) => setValue(field.key, e.target.checked)}
              />
              <Label htmlFor={field.key} className="cursor-pointer font-normal">
                {field.label}
              </Label>
            </div>
          );
        }

        if (field.type === "select" && field.options) {
          return (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Select
                value={String(attributes[field.key] ?? "")}
                onValueChange={(v) => {
                  if (v) setValue(field.key, v);
                }}
                disabled={disabled}
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.type === "multiselect" && field.options) {
          const selected = Array.isArray(attributes[field.key])
            ? (attributes[field.key] as string[])
            : [];
          return (
            <div key={field.key} className="space-y-2 sm:col-span-2">
              <Label>{field.label}</Label>
              <div className="flex flex-wrap gap-2">
                {field.options.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMultiselect(field.key, opt)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </Label>
            <Input
              id={field.key}
              type={field.type === "number" ? "number" : "text"}
              min={field.min}
              placeholder={field.placeholder}
              value={String(attributes[field.key] ?? "")}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                if (field.type === "number") {
                  setValue(field.key, raw === "" ? "" : Number(raw));
                } else {
                  setValue(field.key, raw);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
