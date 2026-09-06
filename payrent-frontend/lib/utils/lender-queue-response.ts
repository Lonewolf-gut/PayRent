export type LenderQueueInsight = {
  pending: Array<Record<string, unknown>>;
  awaitingBuyerAcceptance: Array<Record<string, unknown>>;
  awaitingMandate: Array<Record<string, unknown>>;
  readyToFinance: Array<Record<string, unknown>>;
  waitingOnMerchant: number;
  waitingOnAdminDocs: number;
  waitingOnAdminEligibility: number;
};

export function normalizeLenderQueueResponse(data: unknown): LenderQueueInsight {
  if (Array.isArray(data)) {
    return {
      pending: data,
      awaitingBuyerAcceptance: [],
      awaitingMandate: [],
      readyToFinance: [],
      waitingOnMerchant: 0,
      waitingOnAdminDocs: 0,
      waitingOnAdminEligibility: 0,
    };
  }

  if (data && typeof data === "object" && "pending" in data) {
    const insight = data as Partial<LenderQueueInsight>;
    return {
      pending: Array.isArray(insight.pending) ? insight.pending : [],
      awaitingBuyerAcceptance: Array.isArray(insight.awaitingBuyerAcceptance)
        ? insight.awaitingBuyerAcceptance
        : [],
      awaitingMandate: Array.isArray(insight.awaitingMandate) ? insight.awaitingMandate : [],
      readyToFinance: Array.isArray(insight.readyToFinance) ? insight.readyToFinance : [],
      waitingOnMerchant: Number(insight.waitingOnMerchant ?? 0),
      waitingOnAdminDocs: Number(insight.waitingOnAdminDocs ?? 0),
      waitingOnAdminEligibility: Number(insight.waitingOnAdminEligibility ?? 0),
    };
  }

  return {
    pending: [],
    awaitingBuyerAcceptance: [],
    awaitingMandate: [],
    readyToFinance: [],
    waitingOnMerchant: 0,
    waitingOnAdminDocs: 0,
    waitingOnAdminEligibility: 0,
  };
}
