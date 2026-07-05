import { logger } from "@/lib/logger";
import { sendHubtelSms, isHubtelConfigured } from "@/lib/integrations/sms/hubtel";

export interface SendSmsParams {
  to: string;
  body: string;
}

function logDevSms(params: SendSmsParams) {
  logger.info("SMS sent (log provider)", {
    to: params.to,
    body: params.body,
  });
  return { provider: "log" as const, to: params.to, body: params.body };
}

async function sendTwilioSms(params: SendSmsParams) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio configuration missing");
  }
  const client = require("twilio")(accountSid, authToken);
  return client.messages.create({
    body: params.body,
    from,
    to: params.to,
  });
}

export async function sendSms(params: SendSmsParams) {
  const smsProvider = (process.env.SMS_PROVIDER || "log").trim().toLowerCase();

  if (smsProvider === "log") {
    return logDevSms(params);
  }

  if (smsProvider === "hubtel") {
    if (!isHubtelConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return logDevSms(params);
      }
      throw new Error("Hubtel SMS configuration missing");
    }

    try {
      const result = await sendHubtelSms(params);
      return { provider: "hubtel" as const, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV === "development") {
        logger.error("Hubtel SMS failed; falling back to log provider", { message });
        return logDevSms(params);
      }
      throw error;
    }
  }

  if (smsProvider === "twilio") {
    return sendTwilioSms(params);
  }

  throw new Error(`SMS provider "${smsProvider}" is not supported`);
}
