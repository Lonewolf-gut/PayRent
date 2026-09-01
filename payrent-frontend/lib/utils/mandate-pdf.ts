import type { MandatePreviewData } from "@/lib/utils/mandate-preview";
import { buildMandatePreview } from "@/lib/utils/mandate-preview";

const BRAND_GREEN: [number, number, number] = [5, 150, 105];
const MUTED: [number, number, number] = [100, 116, 139];

function cleanPropertyName(name: string) {
  return name.replace(/^\[Demo\]\s*/i, "");
}

function formatDocumentDate(value?: string | null) {
  if (!value) return "Pending acceptance";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mandateFilename(preview: MandatePreviewData) {
  const id = preview.mandateId ?? preview.financingRequestId;
  const slug = cleanPropertyName(preview.propertyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `payforme-mandate-${slug || id.slice(0, 8)}.pdf`;
}

function formatIdentityLine(
  label?: string | null,
  number?: string | null
): string | null {
  if (label && number) return `${label}: ${number}`;
  return number ?? null;
}

function drawSignatureBlock(
  doc: import("jspdf").jsPDF,
  startY: number,
  options: {
    title: string;
    name: string;
    date?: string | null;
    pendingDate: string;
    identityLine?: string | null;
    margin: number;
    dateColumnX: number;
    contentWidth: number;
  }
) {
  const { title, name, date, pendingDate, identityLine, margin, dateColumnX, contentWidth } =
    options;
  let y = startY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(title, margin, y);
  doc.text("Date", dateColumnX, y);
  y += 5;

  const signatureY = y;
  doc.setFont("times", "bolditalic");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const nameLines = doc.splitTextToSize(name, contentWidth - 58);
  doc.text(nameLines, margin, signatureY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(date ? 15 : 100, date ? 23 : 116, date ? 42 : 139);
  doc.text(date ? formatDocumentDate(date) : pendingDate, dateColumnX, signatureY);
  y = signatureY + Math.max(nameLines.length * 5, 6);

  if (identityLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(identityLine, margin, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(...BRAND_GREEN);
  doc.line(margin, y, margin + contentWidth - 58, y);
  doc.line(dateColumnX, y, dateColumnX + 52, y);

  return y + 10;
}

export async function downloadMandatePdf(preview: MandatePreviewData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const propertyName = cleanPropertyName(preview.propertyName);
  const reference = preview.mandateId ?? preview.financingRequestId;
  const issuedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PayForMe", margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Property financing & scheduled repayment platform", margin, 23);
  doc.text("Accra, Ghana  |  www.payforme.com.gh", margin, 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Mandate ref: ${reference}`, pageWidth - margin, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${issuedDate}`, pageWidth - margin, 22, { align: "right" });
  doc.text(`Status: ${formatStatus(preview)}`, pageWidth - margin, 28, { align: "right" });

  let y = 50;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Direct Debit Mandate Authorization", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(propertyName, margin, y);
  y += 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const rows: Array<[string, string]> = [
    ["Buyer", preview.borrowerName],
    ...(preview.lenderName ? [["Financing lender", preview.lenderName] as [string, string]] : []),
    ["Financed amount", `GHS ${preview.principalAmount.toLocaleString()}`],
    ["Repayment period", `${preview.durationMonths} months`],
  ];

  if (preview.bankName) rows.push(["Bank", preview.bankName]);
  if (preview.accountNumberMasked) rows.push(["Account number", preview.accountNumberMasked]);
  if (preview.accountName) rows.push(["Account name", preview.accountName]);

  if (preview.ratePricingVisible) {
    if (preview.interestRate != null) {
      rows.push(["Interest rate", `${preview.interestRate}% per annum`]);
    }
    if (preview.totalRepayable != null) {
      rows.push(["Total repayable", `GHS ${preview.totalRepayable.toLocaleString()}`]);
    }
    if (preview.monthlyPayment != null) {
      rows.push(["Estimated monthly debit", `GHS ${preview.monthlyPayment.toLocaleString()}`]);
    }
    if (preview.lenderAcceptedAt) {
      rows.push(["Financing agreed on", formatDocumentDate(preview.lenderAcceptedAt)]);
    }
    if (preview.buyerAcceptedAt) {
      rows.push(["Buyer accepted on", formatDocumentDate(preview.buyerAcceptedAt)]);
    }
  } else {
    rows.push(["Repayment totals", "Pending lender financing approval"]);
  }

  rows.push([
    "Auto-debit consent",
    "Buyer authorized scheduled repayments from the selected account.",
  ]);

  for (const [label, value] of rows) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, contentWidth, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 2, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value, contentWidth - 52);
    doc.text(lines, margin + 48, y + 2);
    y += Math.max(10, lines.length * 5);
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorization statement", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const statement = [
    `I, ${preview.borrowerName}, authorize PayForMe and its banking partners to debit my account`,
    `for scheduled repayments relating to the Pay-for-Me financing of ${propertyName}.`,
    preview.ratePricingVisible
      ? `Total obligation: GHS ${(preview.totalRepayable ?? preview.principalAmount).toLocaleString()} over ${preview.durationMonths} months.`
      : "Final repayment amounts will be confirmed after a lender approves financing.",
    "This mandate remains subject to bank approval and applicable regulations.",
  ];
  for (const line of statement) {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.5;
  }

  y += 10;
  const dateColumnX = pageWidth - margin - 55;

  y = drawSignatureBlock(doc, y, {
    title: "Buyer's signature",
    name: preview.borrowerName,
    date: preview.buyerAcceptedAt,
    pendingDate: "Pending acceptance",
    identityLine: formatIdentityLine(
      preview.buyerIdentityDocumentLabel,
      preview.buyerIdentityDocumentNumber
    ),
    margin,
    dateColumnX,
    contentWidth,
  });

  y = drawSignatureBlock(doc, y, {
    title: "Lender's signature",
    name: preview.lenderName ?? "Financing lender",
    date: preview.lenderAcceptedAt,
    pendingDate: "Pending financing",
    identityLine: formatIdentityLine(
      preview.lenderIdentityDocumentLabel,
      preview.lenderIdentityDocumentNumber
    ),
    margin,
    dateColumnX,
    contentWidth,
  });

  if (preview.ratePricingVisible && preview.monthlyPayment != null) {
    doc.setFillColor(236, 253, 245);
    doc.rect(margin, y - 4, contentWidth, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text("Monthly amount to be debited from buyer account", margin + 3, y + 3);
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`GHS ${preview.monthlyPayment.toLocaleString()}`, margin + 3, y + 10);
    y += 18;
  }

  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "PayForMe — Confidential repayment mandate document. Generated electronically.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.save(mandateFilename(preview));
}

function formatStatus(preview: MandatePreviewData) {
  const labels: Record<MandatePreviewData["previewStatus"], string> = {
    awaiting_lender: "Awaiting financing",
    awaiting_buyer: "Complete mandate setup",
    mandate_pending: "Mandate prepared",
    bank_processing: "Bank processing",
    active: "Active mandate",
    declined: "Declined / cancelled",
    none: "Not available",
  };
  return labels[preview.previewStatus];
}

type AdminMandateForPdf = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  buyerIdentityDocumentLabel?: string | null;
  buyerIdentityDocumentNumber?: string | null;
  tenant?: {
    fullName?: string;
    nationalId?: string | null;
    user?: { email?: string; id?: string };
  };
  bankAccount?: {
    bankName?: string;
    accountNumberMasked?: string;
    accountName?: string;
  };
  financingRequest?: {
    id: string;
    status: string;
    durationMonths: number;
    requestedAmount: number | string;
    approvedAmount?: number | string | null;
    offeredInterestRate?: number | string | null;
    approvedAt?: Date | string | null;
    buyerAcceptedAt?: Date | string | null;
    property?: { name?: string | null };
    feeDisclosure?: {
      principalAmount?: number | string | null;
      interestRate?: number | string | null;
      totalRepayable?: number | string | null;
      monthlyPayment?: number | string | null;
      acceptedAt?: Date | string | null;
    } | null;
  } | null;
  lender?: {
    fullName?: string;
    institutionName?: string | null;
    nationalId?: string | null;
  } | null;
  lenderIdentityDocumentLabel?: string | null;
  lenderIdentityDocumentNumber?: string | null;
};

function formatLenderName(lender?: { fullName?: string; institutionName?: string | null } | null) {
  if (!lender?.fullName) return null;
  return lender.institutionName
    ? `${lender.fullName} (${lender.institutionName})`
    : lender.fullName;
}

export function adminMandateToPreview(mandate: AdminMandateForPdf): MandatePreviewData {
  const financing = mandate.financingRequest;
  return buildMandatePreview({
    id: financing?.id ?? mandate.id,
    status: financing?.status ?? "UNKNOWN",
    requestedAmount: financing?.requestedAmount ?? 0,
    approvedAmount: financing?.approvedAmount ?? null,
    offeredInterestRate: financing?.offeredInterestRate ?? null,
    approvedAt: financing?.approvedAt ?? null,
    durationMonths: financing?.durationMonths ?? 0,
    buyerAcceptedAt: financing?.buyerAcceptedAt ?? null,
    lenderName: formatLenderName(mandate.lender),
    lenderIdentityDocumentLabel: mandate.lenderIdentityDocumentLabel ?? null,
    lenderIdentityDocumentNumber:
      mandate.lenderIdentityDocumentNumber ?? mandate.lender?.nationalId ?? null,
    property: financing?.property ?? null,
    tenant: mandate.tenant ?? null,
    feeDisclosure: financing?.feeDisclosure ?? null,
    buyerIdentityDocumentLabel: mandate.buyerIdentityDocumentLabel ?? null,
    buyerIdentityDocumentNumber:
      mandate.buyerIdentityDocumentNumber ?? mandate.tenant?.nationalId ?? null,
    mandate: {
      id: mandate.id,
      status: mandate.status,
      mandateSource: mandate.mandateSource,
      documentUrl: mandate.documentUrl,
      bankAccount: mandate.bankAccount ?? null,
    },
  });
}
