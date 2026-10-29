import type { EmploymentStatus } from "@prisma/client";

export const EMPLOYMENT_STATUS_OPTIONS: {
  value: EmploymentStatus;
  label: string;
}[] = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "STUDENT", label: "Student" },
  { value: "RETIRED", label: "Retired" },
];

export function getEmploymentStatusLabel(status?: string | null) {
  return (
    EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    "Not set"
  );
}

export function requiresEmploymentDocuments(status?: string | null) {
  return status === "EMPLOYED";
}

export function isEmploymentRecorded(
  status?: string | null,
  profileComplete?: boolean,
  employmentVerified?: boolean
) {
  if (employmentVerified) return true;
  if (!profileComplete || !status) return false;
  return !requiresEmploymentDocuments(status);
}
