import { normalizeGhanaPhone } from "@/lib/integrations/sms/phone";

/** Hubtel expects MSISDN without + prefix, e.g. 233501234567 */
export function toHubtelMsisdn(phone: string): string {
  return normalizeGhanaPhone(phone).replace(/^\+/, "");
}

/** Map Ghana mobile prefix to Hubtel channel slug */
export function detectHubtelChannel(phone: string): string {
  const digits = toHubtelMsisdn(phone);
  const local = digits.startsWith("233") ? digits.slice(3) : digits;
  const prefix = local.slice(0, 3);

  if (["024", "054", "055", "059", "025"].includes(prefix)) return "mtn-gh";
  if (["020", "050"].includes(prefix)) return "vodafone-gh";
  if (["027", "057", "026", "056"].includes(prefix)) return "tigo-gh";

  return process.env.HUBTEL_DEFAULT_CHANNEL?.trim() || "mtn-gh";
}
