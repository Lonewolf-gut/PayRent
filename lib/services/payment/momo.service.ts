import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

export interface MomoPaymentRequest {
  amount: number;
  phone: string;
  reference?: string;
  description?: string;
  callbackUrl?: string;
}

export interface MomoPaymentResult {
  reference: string;
  momoReferenceId: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  externalId?: string;
  message?: string;
}

/**
 * MTN MoMo collection integration
 * Supports both sandbox and production environments via MTN MoMo Open API
 *
 * Environment Variables:
 * - MOMO_API_KEY: API key for authorization
 * - MOMO_SUBSCRIPTION_KEY: Subscription key for Collections product
 * - MOMO_API_USER: API user for authentication
 * - MOMO_API_URL: Base URL (https://sandbox.momodeveloper.mtn.com or production)
 * - MOMO_CALLBACK_URL: Webhook callback URL for payment confirmations
 * - MOMO_TARGET_ENVIRONMENT: sandbox | mtnghana | etc. (auto-detected from URL)
 * - MOMO_CURRENCY: EUR for sandbox, GHS for Ghana production
 */
export class MomoService {
  private apiKey = process.env.MOMO_API_KEY || "";
  private subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY || "";
  private apiUser = process.env.MOMO_API_USER || "";
  private apiUrl = process.env.MOMO_API_URL || "https://sandbox.momodeveloper.mtn.com";
  private callbackUrl = process.env.MOMO_CALLBACK_URL || "";

  private get targetEnvironment() {
    const configured = process.env.MOMO_TARGET_ENVIRONMENT?.trim();
    if (configured) return configured;
    return this.apiUrl.includes("sandbox") ? "sandbox" : "mtnghana";
  }

  private get currency() {
    const configured = process.env.MOMO_CURRENCY?.trim();
    if (configured) return configured;
    return this.apiUrl.includes("sandbox") ? "EUR" : "GHS";
  }

  private isConfigured() {
    return Boolean(this.apiKey && this.subscriptionKey && this.apiUser);
  }

  private isSandbox() {
    return this.targetEnvironment === "sandbox" || this.apiUrl.includes("sandbox");
  }

  /**
   * Request a payment from a customer via MoMo
   * This initiates an asynchronous payment flow
   */
  async requestPayment(input: MomoPaymentRequest): Promise<MomoPaymentResult> {
    const reference = input.reference ?? `MOMO-${uuidv4().slice(0, 8).toUpperCase()}`;
    const momoReferenceId = uuidv4();

    logger.info("MoMo payment requested", {
      reference,
      momoReferenceId,
      amount: input.amount,
      phone: input.phone.slice(-4),
      environment: this.targetEnvironment,
    });

    if (!this.isConfigured()) {
      return {
        reference,
        momoReferenceId,
        status: "FAILED",
        message:
          "MoMo is not fully configured. Set MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, and MOMO_API_KEY in your .env file.",
      };
    }

    try {
      const payload = {
        amount: input.amount.toString(),
        currency: this.currency,
        externalId: reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: this.normalizePhoneNumber(input.phone),
        },
        payerMessage: input.description || "PayForMe Payment",
        payeeNote: "Payment for PayForMe",
      };

      const response = await fetch(`${this.apiUrl}/collection/v1_0/requesttopay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
          "X-Reference-Id": momoReferenceId,
          "X-Target-Environment": this.targetEnvironment,
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error("MoMo API error", {
          reference,
          momoReferenceId,
          status: response.status,
          error,
        });

        return {
          reference,
          momoReferenceId,
          status: "FAILED",
          message: `MoMo API error (${response.status}). Check server logs and your MoMo credentials.`,
        };
      }

      logger.info("MoMo payment request accepted", {
        reference,
        momoReferenceId,
      });

      return {
        reference,
        momoReferenceId,
        status: "PENDING",
        externalId: momoReferenceId,
        message: this.isSandbox()
          ? "Sandbox payment request accepted. MTN sandbox does not send real USSD prompts to your phone — use MTN test numbers or poll payment status in the app."
          : "Approve the MoMo prompt on your phone to complete payment.",
      };
    } catch (error) {
      logger.error("MoMo payment request failed", {
        reference,
        momoReferenceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        reference,
        momoReferenceId,
        status: "FAILED",
        message: "Payment request failed — check your MoMo credentials and internet connection.",
      };
    }
  }

  /**
   * Verify payment status using the MTN transaction reference (X-Reference-Id)
   */
  async verifyPayment(momoReferenceId: string, clientReference?: string): Promise<MomoPaymentResult> {
    const reference = clientReference ?? momoReferenceId;

    logger.info("MoMo payment verify", { reference, momoReferenceId });

    if (!this.isConfigured()) {
      return { reference, momoReferenceId, status: "PENDING" };
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/collection/v1_0/requesttopay/${momoReferenceId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await this.getAccessToken()}`,
            "X-Target-Environment": this.targetEnvironment,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          },
        }
      );

      if (!response.ok) {
        logger.warn("MoMo verify error", {
          reference,
          momoReferenceId,
          status: response.status,
        });
        return { reference, momoReferenceId, status: "PENDING" };
      }

      const data = await response.json();
      const status =
        data.status === "SUCCESSFUL"
          ? "SUCCESSFUL"
          : data.status === "FAILED"
            ? "FAILED"
            : "PENDING";

      return {
        reference,
        momoReferenceId,
        status: status as "PENDING" | "SUCCESSFUL" | "FAILED",
        externalId: data.externalId,
      };
    } catch (error) {
      logger.error("MoMo verify failed", {
        reference,
        momoReferenceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { reference, momoReferenceId, status: "PENDING" };
    }
  }

  /**
   * Get OAuth 2.0 access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/collection/token/`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        Authorization: `Basic ${Buffer.from(`${this.apiUser}:${this.apiKey}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Failed to get MoMo access token", {
        status: response.status,
        error,
      });
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token as string;
  }

  /**
   * Normalize phone number to MSISDN format
   * Converts local format (0xx) to international (+233xx)
   */
  private normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      return `233${digits.slice(1)}`;
    }

    if (digits.startsWith("233")) {
      return digits;
    }

    return `233${digits.slice(-9)}`;
  }
}

export const momoService = new MomoService();
