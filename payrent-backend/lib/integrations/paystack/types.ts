export type PaystackTransactionData = {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  gateway_response?: string;
  paid_at?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type PaystackWebhookEvent = {
  event: string;
  data: PaystackTransactionData & {
    transfer_code?: string;
    recipient?: {
      details?: {
        account_number?: string;
        bank_code?: string;
      };
    };
  };
};

export type PaystackTransferData = {
  reference: string;
  transfer_code: string;
  status: string;
  amount: number;
  currency: string;
};
