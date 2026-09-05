export type EmtechTransactionType = "DEPOSIT" | "WITHDRAWAL" | "EXCHANGE" | "PAYMENT" | "OTHER";

export type EmtechTransactionStatus = "SUCCESS" | "FAILED" | "REJECT" | "SUSPECT" | "OTHER";

export type EmtechAccountType =
  | "CASH"
  | "CREDIT"
  | "BANK"
  | "MOBILE_MONEY"
  | "AIRTIME"
  | "CRYPTOCURRENCY";

export type EmtechCurrencyType = "FIAT" | "CREDIT" | "VIRTUAL";

export type EmtechTransactionChannel =
  | "WEB"
  | "MOBILE_APP"
  | "MOBILE_USSD"
  | "ATM"
  | "KIOSK"
  | "POS"
  | "OTHER";

export type EmtechKycStatus = "VERIFIED" | "UNVERIFIED" | "NOTCHECKED";

export type EmtechKycType =
  | "HUMAN_VERIFIED"
  | "NATIONAL_ID_TEXT"
  | "NATIONAL_ID_IMAGE"
  | "MOBILE_PHOTO"
  | "OTHER";

export type EmtechKycLevel = "MINIMUM" | "MEDIUM" | "ENHANCED" | "OTHER";

export type EmtechTransactionPayload = {
  transactionId: string;
  transactionType: EmtechTransactionType;
  transactionStatus: EmtechTransactionStatus;
  transactionDatetime: string;
  transactionChannel: EmtechTransactionChannel;
  transactionDeviceId: string;
  originUserId: string;
  originAmount: number;
  originCurrency: string;
  originCurrencyType: EmtechCurrencyType;
  originAccountID: string;
  originAccountType: EmtechAccountType;
  originAccountCity: string;
  originAccountCountry: string;
  originUserKYCStatus: EmtechKycStatus;
  originUserKYCType: EmtechKycType;
  originUserKYCService: string;
  originUserKYCLevel: EmtechKycLevel;
  destinationAmount: number;
  destinationCurrency: string;
  destinationCurrencyType: EmtechCurrencyType;
  destinationAccountId: string;
  destinationAccountType: EmtechAccountType;
  destinationAccountCity: string;
  destinationAccountCountry: string;
  transactionFeeAmount: number;
  transactionFeeCurrency: string;
  transactionFeeCurrencyType: EmtechCurrencyType;
  originAccountRegion?: string;
  destinationAccountRegion?: string;
  originAccountProvider?: string;
  destinationAccountProvider?: string;
  transactionReason?: string;
  gatewayTransactionId?: string;
  gatewayTransactionProvider?: string;
  originUserKYCTypeDetails?: string;
  meta?: Record<string, unknown>;
};

export type EmtechConsumerComplaintPayload = {
  userId: string;
  complaintId: string;
  complaintType: "FRAUD" | "DISPUTE" | "SERVICE_ERROR" | "SYSTEM_DOWNTIME" | "MISCONDUCT OTHER";
  complaintStatus:
    | "OPENED"
    | "CLOSED"
    | "REOPENED"
    | "PENDING_RESOLUTION"
    | "RESOLVED";
  complaintStatusDatetime: string;
  complaintTypeDescription?: string;
  resolutionDescription?: string;
  meta?: Record<string, unknown>;
};

export type EmtechAuthResponse = {
  accessToken: string;
  expiryMS: number;
};
