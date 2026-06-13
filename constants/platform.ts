import type { UserRole } from "@prisma/client";

export const PLATFORM_NAME = "PayForme";
export const PLATFORM_TAGLINE =
  "A subscription-first marketplace for properties, vehicles, and appliances.";

export const ROLE_LABELS: Record<UserRole, string> = {
  TENANT: "Tenant",
  LANDLORD: "Landlord",
  AGENT: "Agent",
  LENDER: "Lender",
  ADMIN: "Administrator",
  CEO: "CEO",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  TENANT:
    "Search listings, apply for properties, request rent financing, manage mandates and repayments.",
  LANDLORD:
    "Create and publish listings, review tenant applications, and track settlements.",
  AGENT:
    "Manage assigned listings, support landlords, and review tenant applications.",
  LENDER:
    "Review eligible financing requests, approve funding, and monitor repayment performance.",
  ADMIN:
    "Moderate listings, review KYC and mandates, resolve exceptions, and oversee compliance.",
};

export const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Onboard & verify",
    description:
      "Register, verify contact details, complete Ghana Card KYC, and validate your bank account.",
  },
  {
    step: 2,
    title: "Apply for a property",
    description:
      "Search published listings, submit an application with documents, and await landlord approval.",
  },
  {
    step: 3,
    title: "Request Pay for Rent financing",
    description:
      "Create a financing request, set up a repayment mandate, and pass lender review.",
  },
  {
    step: 4,
    title: "Repay & settle",
    description:
      "Track scheduled deductions, monitor repayments, and view settlement status for all parties.",
  },
];

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  CLARIFICATION_REQUIRED: "Clarification Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const FINANCING_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ELIGIBILITY_PENDING: "Eligibility Pending",
  MANDATE_PENDING: "Mandate Pending",
  READY_FOR_LENDER_REVIEW: "Ready for Lender Review",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  FUNDED: "Funded",
  DISBURSED: "Disbursed",
  REPAYMENT_ACTIVE: "Repayment Active",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  DEFAULTED: "Defaulted",
};

export const MANDATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUBMISSION: "Pending Submission",
  SUBMITTED: "Submitted",
  ADMIN_REVIEW: "Admin Review",
  BANK_PROCESSING: "Bank Processing",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  ARCHIVED: "Archived",
  PENDING_MANUAL_RESOLUTION: "Pending Manual Resolution",
};

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
];
