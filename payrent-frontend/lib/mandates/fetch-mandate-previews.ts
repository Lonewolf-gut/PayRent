import { buildMandatePreview, type MandatePreviewData } from "@/lib/utils/mandate-preview";

const TERMINAL_FINANCING_STATUSES = new Set([
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
  "COMPLETED",
]);

export async function fetchMandatePreviews(): Promise<MandatePreviewData[]> {
  const endpoints = ["/api/mandates/overview", "/api/financing/mandate-previews"];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (res.ok && json.success !== false && Array.isArray(json.data)) {
        const active = (json.data as MandatePreviewData[]).filter(
          (preview) => !TERMINAL_FINANCING_STATUSES.has(preview.financingStatus)
        );
        if (active.length > 0) return active;
      }
    } catch {
      // try next endpoint
    }
  }

  const financingRes = await fetch("/api/financing");
  const financingJson = await financingRes.json();
  if (!financingRes.ok || financingJson.success === false) {
    throw new Error(financingJson.message ?? "Could not load mandates");
  }

  const requests = (financingJson.data ?? []).filter(
    (request: { status: string }) => !TERMINAL_FINANCING_STATUSES.has(request.status)
  );

  if (!requests.length) return [];

  for (const request of requests) {
    try {
      await fetch("/api/mandates/ensure-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId: request.id }),
      });
    } catch {
      // continue
    }
  }

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (res.ok && json.success !== false && Array.isArray(json.data) && json.data.length > 0) {
        return json.data as MandatePreviewData[];
      }
    } catch {
      // try next endpoint
    }
  }

  return requests.map((request: Record<string, unknown>) =>
    buildMandatePreview({
      id: request.id as string,
      status: request.status as string,
      requestedAmount: request.requestedAmount as number,
      approvedAmount: request.approvedAmount as number | null,
      offeredInterestRate: request.offeredInterestRate as number | null,
      durationMonths: request.durationMonths as number,
      buyerAcceptedAt: request.buyerAcceptedAt as string | null,
      property: request.property as { name?: string; id?: string },
      tenant: request.tenant as {
        fullName?: string;
        user?: { email?: string };
      },
      feeDisclosure: request.feeDisclosure as {
        principalAmount?: number;
        interestRate?: number;
        totalRepayable?: number;
        monthlyPayment?: number;
      } | null,
      mandate: request.mandate as {
        id: string;
        status: string;
        mandateSource: string;
        documentUrl?: string | null;
      } | null,
      repaymentPreference: request.repaymentPreference as { bankAccountId?: string } | null,
    })
  );
}

export function filterMandatePreviewsForProperty(
  previews: MandatePreviewData[],
  propertyId: string,
  propertyName?: string
) {
  const normalizedName = propertyName?.replace(/^\[Demo\]\s*/i, "").trim().toLowerCase();
  return previews.filter((preview) => {
    const previewName = preview.propertyName.replace(/^\[Demo\]\s*/i, "").trim().toLowerCase();
    if (normalizedName && previewName === normalizedName) return true;
    return false;
  });
}
