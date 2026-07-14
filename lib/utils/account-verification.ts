export type VerificationStatusSnapshot = {
  profileStatus?: string;
  kycVerified?: boolean;
  identityVerified?: boolean;
  verifications?: { type: string; status: string }[];
  bankAccounts?: { isVerified?: boolean; validationStatus?: string }[];
};

export type VerificationChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  pending?: boolean;
};

export function getVerificationChecklist(status?: VerificationStatusSnapshot) {
  if (!status) {
    return [
      { id: "profile", label: "Complete your profile", complete: false },
      { id: "identity", label: "Verify your identity (KYC)", complete: false },
      { id: "bank", label: "Add and verify a bank account", complete: false },
    ] satisfies VerificationChecklistItem[];
  }

  const profileComplete =
    status.profileStatus === "PROFILE_COMPLETED" || status.profileStatus === "KYC_VERIFIED";
  const identityVerified = Boolean(status.kycVerified || status.identityVerified);
  const identityPending =
    status.verifications?.some((item) => item.type === "IDENTITY" && item.status === "PENDING") ??
    false;
  const bankVerified = status.bankAccounts?.some((item) => item.isVerified) ?? false;
  const bankPending =
    status.bankAccounts?.some((item) => item.validationStatus === "PENDING") ?? false;

  return [
    {
      id: "profile",
      label: "Complete your profile",
      complete: profileComplete,
    },
    {
      id: "identity",
      label: "Verify your identity (KYC)",
      complete: identityVerified,
      pending: !identityVerified && identityPending,
    },
    {
      id: "bank",
      label: "Add and verify a bank account",
      complete: bankVerified,
      pending: !bankVerified && bankPending,
    },
  ] satisfies VerificationChecklistItem[];
}

export function isAccountFullyVerified(status?: VerificationStatusSnapshot) {
  const checklist = getVerificationChecklist(status);
  return checklist.every((item) => item.complete);
}

export function deriveAccountStatusLabel(status?: VerificationStatusSnapshot) {
  if (!status) {
    return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
  }

  const checklist = getVerificationChecklist(status);
  const complete = checklist.every((item) => item.complete);
  const pending = checklist.some((item) => item.pending);

  if (complete) {
    return { label: "Verified", className: "bg-emerald-100 text-emerald-800" };
  }

  if (pending) {
    return { label: "Pending", className: "bg-sky-100 text-sky-800" };
  }

  return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
}
