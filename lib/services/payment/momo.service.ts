import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface MomoPaymentRequest {
  amount: number;
  phone: string;
  reference?: string;
  description?: string;
  callbackUrl?: string;
}

export interface MomoPaymentResult {
  reference: string;
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
 * - MOMO_API_URL: Base URL (https://sandbox.momoapi.mtn.com or production)
 * - MOMO_CALLBACK_URL: Webhook callback URL for payment confirmations
 */
export class MomoService {
  private apiKey = process.env.MOMO_API_KEY || "";
  private subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY || "";
  private apiUser = process.env.MOMO_API_USER || "";
  private apiUrl = process.env.MOMO_API_URL || "https://sandbox.momoapi.mtn.com";
  private callbackUrl = process.env.MOMO_CALLBACK_URL || "";

  /**
   * Request a payment from a customer via MoMo
   * This initiates an asynchronous payment flow
   */
  async requestPayment(input: MomoPaymentRequest): Promise<MomoPaymentResult> {
    const reference = input.reference ?? `MOMO-${uuidv4().slice(0, 8).toUpperCase()}`;
    const correlationId = uuidv4();

    logger.info("MoMo payment requested", {
      reference,
      amount: input.amount,
      phone: input.phone.slice(-4),
    });

    // Sandbox/Development mode
    if (!this.isProductionMode()) {
      return {
        reference,
        status: "PENDING",
        externalId: `sandbox-${reference}`,
        message: "Sandbox payment initiated - webhook simulation in 5 seconds",
      };
    }

    try {
      // Production: Call MTN MoMo Request-to-Pay API
      const payload = {
        amount: input.amount.toString(),
        currency: "GHS",
        externalId: reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: this.normalizePhoneNumber(input.phone),
        },
        payerMessage: input.description || "RentVest Payment",
        payeeNote: "Payment for RentVest platform",
        callbackUrl: input.callbackUrl || this.callbackUrl,
      };

      const response = await fetch(
        `${this.apiUrl}/v1_0/requesttopay`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await this.getAccessToken()}`,
            "X-Reference-Id": correlationId,
            "X-Target-Environment": "production",
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error("MoMo API error", {
          reference,
          status: response.status,
          error,
        });

        return {
          reference,
          status: "FAILED",
          message: `API Error: ${response.status}`,
        };
      }

      logger.info("MoMo payment request accepted", {
        reference,
        correlationId,
      });

      return {
        reference,
        status: "PENDING",
        externalId: reference,
        message: "Payment initiated - awaiting customer confirmation",
      };
    } catch (error) {
      logger.error("MoMo payment request failed", {
        reference,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        reference,
        status: "FAILED",
        message: "Payment request failed - please try again",
      };
    }
  }

  /**
   * Verify payment status
   * Polls the MoMo API to check transaction status
   */
  async verifyPayment(reference: string): Promise<MomoPaymentResult> {
    logger.info("MoMo payment verify", { reference });

    if (!this.isProductionMode()) {
      return { reference, status: "SUCCESSFUL" };
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/v1_0/requesttopay/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await this.getAccessToken()}`,
            "X-Target-Environment": "production",
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          },
        }
      );

      if (!response.ok) {
        logger.warn("MoMo verify error", {
          reference,
          status: response.status,
        });
        return { reference, status: "PENDING" };
      }

      const data = await response.json();
      const status = data.status === "SUCCESSFUL" ? "SUCCESSFUL" : data.status === "FAILED" ? "FAILED" : "PENDING";

      return {
        reference,
        status: status as "PENDING" | "SUCCESSFUL" | "FAILED",
        externalId: data.externalId,
      };
    } catch (error) {
      logger.error("MoMo verify failed", {
        reference,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { reference, status: "PENDING" };
    }
  }

  /**
   * Get OAuth 2.0 access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.apiUser}:${this.apiKey}`
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      logger.error("Failed to get MoMo access token", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Normalize phone number to MSISDN format
   * Converts local format (0xx) to international (+233xx)
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Convert 0-prefixed to +233
    if (digits.startsWith("0")) {
      return `+233${digits.slice(1)}`;
    }

    // If already has country code
    if (digits.startsWith("233")) {
      return `+${digits}`;
    }

    // Assume it's a local number without country code
    return `+233${digits.slice(-9)}`;
  }

  /**
   * Check if running in production mode
   */
  private isProductionMode(): boolean {
    return this.apiKey !== "" && this.subscriptionKey !== "";
  }
}

export const momoService = new MomoService();
