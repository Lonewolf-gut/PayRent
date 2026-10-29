export type HubtelApiResponse<T = Record<string, unknown>> = {
  ResponseCode?: string;
  Message?: string;
  Data?: T;
};

export type HubtelTransactionData = {
  ClientReference?: string;
  TransactionId?: string;
  ExternalTransactionId?: string;
  Amount?: number;
  AmountAfterCharges?: number;
  Charges?: number;
  Description?: string;
  Status?: string;
  PaymentDate?: string;
};

export type HubtelPaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED";
