import { logger } from "@/lib/logger";

export interface SendSmsParams {
  to: string;
  body: string;
}

export async function sendSms(params: SendSmsParams) {
  const smsProvider = process.env.SMS_PROVIDER || "log";

  if (smsProvider === "log") {
    logger.info("SMS sent (log provider)", {
      to: params.to,
      body: params.body,
    });
    return { provider: "log", to: params.to, body: params.body };
  }

  if (smsProvider === "twilio") {
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

  throw new Error(`SMS provider ${smsProvider} not supported`);
}
