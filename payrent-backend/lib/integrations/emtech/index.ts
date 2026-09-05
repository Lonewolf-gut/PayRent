export { getEmtechConfig, isEmtechConfigured } from "@/lib/integrations/emtech/config";
export {
  postEmtechConsumerComplaint,
  postEmtechTransaction,
  resetEmtechAuthCacheForTests,
  verifyEmtechConnection,
} from "@/lib/integrations/emtech/client";
export {
  reportConsumerComplaint,
  reportMandateDeduction,
  reportWalletTransaction,
  scheduleEmtechReport,
} from "@/lib/integrations/emtech/reporting.service";
export type {
  EmtechConsumerComplaintPayload,
  EmtechTransactionPayload,
} from "@/lib/integrations/emtech/types";
