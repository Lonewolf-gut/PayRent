export const TERMINAL_FINANCING_STATUSES = new Set([
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
  "COMPLETED",
]);

export type FinancingRequestSummary = {
  id: string;
  propertyId: string;
  status: string;
  mandateId?: string | null;
};

export function getActiveFinancingForProperty<T extends FinancingRequestSummary>(
  requests: T[],
  propertyId: string
): T | undefined {
  return requests.find(
    (request) =>
      request.propertyId === propertyId && !TERMINAL_FINANCING_STATUSES.has(request.status)
  );
}
