export type LenderQueueInsight = {
  pending: Array<Record<string, unknown>>;
  waitingOnMerchant: number;
  waitingOnAdminDocs: number;
  waitingOnAdminEligibility: number;
};

export function normalizeLenderQueueResponse(data: unknown): LenderQueueInsight {
  if (Array.isArray(data)) {
    return {
      pending: data,
      waitingOnMerchant: 0,
      waitingOnAdminDocs: 0,
      waitingOnAdminEligibility: 0,
    };
  }

  if (data && typeof data === "object" && "pending" in data) {
    const insight = data as Partial<LenderQueueInsight>;
    return {
      pending: Array.isArray(insight.pending) ? insight.pending : [],
      waitingOnMerchant: Number(insight.waitingOnMerchant ?? 0),
      waitingOnAdminDocs: Number(insight.waitingOnAdminDocs ?? 0),
      waitingOnAdminEligibility: Number(insight.waitingOnAdminEligibility ?? 0),
    };
  }

  return {
    pending: [],
    waitingOnMerchant: 0,
    waitingOnAdminDocs: 0,
    waitingOnAdminEligibility: 0,
  };
}
