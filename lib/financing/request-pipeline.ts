import { FINANCING_STATUS_LABELS, APPLICATION_STATUS_LABELS } from "@/constants/platform";

export type RequestPipelineStep = {
  id: string;
  label: string;
  approver: string;
  status: "complete" | "current" | "upcoming" | "rejected";
  description: string;
};

export function buildRequestPipeline(input: {
  applicationStatus?: string | null;
  financingStatus?: string | null;
  financingDocsApproved?: boolean;
  kycVerified?: boolean;
  isSale?: boolean;
  hasFinancingRequest?: boolean;
}): RequestPipelineStep[] {
  const appStatus = input.applicationStatus ?? null;
  const finStatus = input.financingStatus ?? null;
  const appApproved = appStatus === "APPROVED";
  const appRejected = appStatus === "REJECTED";
  const appPending = appStatus && !appApproved && !appRejected;

  const steps: RequestPipelineStep[] = [
    {
      id: "submit-application",
      label: input.isSale ? "Submit purchase application" : "Submit rental application",
      approver: "You (Customer)",
      status: !appStatus ? "current" : appRejected ? "rejected" : "complete",
      description: "Provide your details and submit the application.",
    },
    {
      id: "merchant",
      label: "Merchant review",
      approver: "Merchant",
      status: appRejected
        ? "rejected"
        : appApproved
          ? "complete"
          : appPending
            ? "current"
            : "upcoming",
      description: "The merchant approves or rejects your application.",
    },
    {
      id: "financing-docs",
      label: "Financing documents",
      approver: "Administrator",
      status: !input.hasFinancingRequest
        ? "upcoming"
        : input.financingDocsApproved
          ? "complete"
          : input.kycVerified
            ? "current"
            : "upcoming",
      description: "Upload payslip and bank statement for admin review.",
    },
    {
      id: "submit-financing",
      label: "Submit Pay-for-Me request",
      approver: "You (Customer)",
      status: !input.hasFinancingRequest
        ? "upcoming"
        : finStatus && finStatus !== "CREATED"
          ? "complete"
          : input.financingDocsApproved && appApproved
            ? "current"
            : input.hasFinancingRequest
              ? "complete"
              : "upcoming",
      description: "Enter amount, repayment period, and submit for eligibility review.",
    },
    {
      id: "admin-eligibility",
      label: "Eligibility review",
      approver: "Administrator",
      status: getFinancingStepStatus(finStatus, "ELIGIBILITY_PENDING", appApproved),
      description: "Platform admin reviews affordability and eligibility.",
    },
    {
      id: "lender",
      label: "Lender financing",
      approver: "Lender",
      status: getFinancingStepStatus(
        finStatus,
        ["READY_FOR_LENDER_REVIEW", "PENDING", "UNDER_REVIEW"],
        appApproved
      ),
      description: "A lender reviews the listing and sends a financing offer with an interest rate.",
    },
    {
      id: "buyer-offer",
      label: "Review lender offer",
      approver: "You (Customer)",
      status: getFinancingStepStatus(finStatus, "APPROVED", appApproved),
      description: "Review the lender's amount, interest rate, and estimated payment before accepting.",
    },
    {
      id: "mandate",
      label: "Repayment mandate",
      approver: "You + Bank",
      status: getFinancingStepStatus(finStatus, "MANDATE_PENDING", appApproved),
      description: "After you accept, your repayment mandate is sent to the bank for activation.",
    },
    {
      id: "disbursement",
      label: "Disbursement & delivery",
      approver: "Merchant",
      status: getFinancingStepStatus(finStatus, ["DISBURSED", "REPAYMENT_ACTIVE"], appApproved),
      description: "Funds go to merchant after you accept; merchant confirms delivery.",
    },
    {
      id: "repayments",
      label: "Repayment schedule",
      approver: "You (Customer)",
      status: finStatus === "REPAYMENT_ACTIVE" ? "complete" : "upcoming",
      description: "Monthly installments are activated on your dashboard.",
    },
  ];

  if (finStatus === "REJECTED") {
    const rejectedIdx = steps.findIndex((s) => s.status === "current");
    if (rejectedIdx >= 0) steps[rejectedIdx].status = "rejected";
  }

  return steps;
}

function getFinancingStepStatus(
  finStatus: string | null | undefined,
  match: string | string[],
  appApproved: boolean
): RequestPipelineStep["status"] {
  if (!appApproved || !finStatus) return "upcoming";

  const matches = Array.isArray(match) ? match : [match];
  const order = [
    "CREATED",
    "ELIGIBILITY_PENDING",
    "MANDATE_PENDING",
    "READY_FOR_LENDER_REVIEW",
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "DISBURSED",
    "REPAYMENT_ACTIVE",
    "REJECTED",
  ];

  if (finStatus === "REJECTED") return "rejected";

  const finIdx = order.indexOf(finStatus);
  const maxMatchIdx = Math.max(...matches.map((m) => order.indexOf(m)).filter((i) => i >= 0));

  if (matches.includes(finStatus)) return "current";
  if (finIdx > maxMatchIdx) return "complete";
  return "upcoming";
}

export function getCurrentApproverLabel(steps: RequestPipelineStep[]) {
  const current = steps.find((s) => s.status === "current");
  if (!current) {
    const allComplete = steps.every((s) => s.status === "complete");
    if (allComplete) return "Complete — repayment schedule active";
    return "Waiting for next step";
  }
  if (current.id === "lender") {
    return "Waiting for financing";
  }
  if (current.id === "buyer-offer") {
    return "Review lender offer — check the interest rate before accepting";
  }
  return `Waiting on: ${current.approver} — ${current.label}`;
}

export function getFinancingStatusLabel(status?: string | null) {
  if (!status) return null;
  return FINANCING_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function getApplicationStatusLabel(status?: string | null) {
  if (!status) return null;
  return APPLICATION_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}
