import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { Decimal } from "@prisma/client/runtime/library";
import type { DeductionStatus, MandateStatus } from "@prisma/client";

/**
 * Bank mandate execution service
 * Handles:
 * - Debit mandate submission to banks
 * - Status polling and updates
 * - Deduction event recording and tracking
 * - Retry logic for failed deductions
 * - Reconciliation with bank responses
 */

export interface BankDebitRequest {
  mandateId: string;
  amount: Decimal;
  description: string;
  deductionEventId: string;
}

export interface BankDebitResponse {
  status: DeductionStatus;
  bankReference?: string;
  failureReason?: string;
  retryable: boolean;
}

export class MandateExecutionService {
  private bankApiUrl = process.env.BANK_API_URL || "";
  private bankApiKey = process.env.BANK_API_KEY || "";

  /**
   * Execute a single deduction attempt against an active mandate
   * Typically called by the repayment scheduler
   */
  async executeDeduction(
    installmentId: string,
    mandateId: string,
    attemptNumber: number = 1
  ): Promise<BankDebitResponse> {
    const requestId = `ded_${Date.now()}`;

    try {
      // 1. Get installment and validate
      const installment = await prisma.installment.findUnique({
        where: { id: installmentId },
        include: {
          repaymentPlan: {
            include: {
              financing: {
                include: {
                  mandate: { include: { bankAccount: true } },
                  tenant: { include: { user: true } },
                },
              },
            },
          },
        },
      });

      if (!installment) {
        logger.error("Installment not found", {
          requestId,
          installmentId,
        });
        return {
          status: "FAILED",
          failureReason: "Installment not found",
          retryable: false,
        };
      }

      const financingRequest = installment.repaymentPlan.financing;
      const mandate = financingRequest.mandate;
      if (!mandate) {
        logger.error("Mandate not found for deduction", {
          requestId,
          installmentId,
        });
        return {
          status: "FAILED",
          failureReason: "Mandate not found",
          retryable: false,
        };
      }

      if (mandate.status !== "ACTIVE") {
        logger.warn("Mandate not active", {
          requestId,
          mandateId,
          status: mandate.status,
        });
        return {
          status: "FAILED",
          failureReason: `Mandate status is ${mandate.status}`,
          retryable: true,
        };
      }

      // 3. Validate deduction amount and installment
      const amountDue = installment.amount.minus(installment.amountPaid);

      if (amountDue.lte(0)) {
        logger.info("Installment already completed", {
          requestId,
          installmentId,
        });
        return {
          status: "SUCCESSFUL",
          failureReason: "Already paid",
          retryable: false,
        };
      }

      // 4. Check if we're within reasonable retry window (7 days from due date)
      const daysOverdue = Math.floor(
        (new Date().getTime() - installment.dueDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysOverdue > 7 && attemptNumber >= 3) {
        logger.warn("Max retry attempts exceeded for overdue installment", {
          requestId,
          installmentId,
          daysOverdue,
        });
        return {
          status: "FAILED",
          failureReason: "Max retries exceeded",
          retryable: false,
        };
      }

      // 5. Create deduction event record
      const deductionEvent = await prisma.deductionEvent.create({
        data: {
          installmentId,
          mandateId,
          attemptNumber,
          attemptedAmount: amountDue,
          status: "PENDING",
        },
      });

      logger.info("Deduction event created", {
        requestId,
        deductionEventId: deductionEvent.id,
        amount: amountDue.toString(),
        attempt: attemptNumber,
      });

      // 6. Submit debit instruction to bank
      const bankResponse = await this.submitBankDebitInstruction({
        mandateId,
        amount: amountDue,
        description: `RentVest repayment - Installment ${installment.instalmentNumber}/${financingRequest.durationMonths}`,
        deductionEventId: deductionEvent.id,
      });

      // 7. Update deduction event with bank response
      let deductionStatus: DeductionStatus = "PENDING";
      if (bankResponse.status === "SUCCESSFUL") {
        deductionStatus = "SUCCESSFUL";
      } else if (bankResponse.status === "FAILED" && !bankResponse.retryable) {
        deductionStatus = "FAILED";
      } else if (bankResponse.status === "FAILED" && bankResponse.retryable) {
        deductionStatus = "RETRY_SCHEDULED";
      }

      const updatedDeduction = await prisma.deductionEvent.update({
        where: { id: deductionEvent.id },
        data: {
          status: deductionStatus,
          providerReference: bankResponse.bankReference || `manual_${requestId}`,
          completedAt: ["SUCCESSFUL", "FAILED"].includes(deductionStatus)
            ? new Date()
            : undefined,
          nextRetryAt:
            deductionStatus === "RETRY_SCHEDULED"
              ? this.calculateNextRetryTime(attemptNumber)
              : undefined,
        },
      });

      // 8. If successful, update installment payment status
      if (deductionStatus === "SUCCESSFUL") {
        const updatedInstallment = await prisma.installment.update({
          where: { id: installmentId },
          data: {
            amountPaid: installment.amountPaid.plus(amountDue),
            status: installment.amountPaid.plus(amountDue).gte(installment.amount)
              ? "PAID"
              : "PARTIALLY_PAID",
            paidAt: new Date(),
          },
        });

        // Send success notification
        await notificationService.send({
          userId: financingRequest.tenant.userId,
          type: "DEDUCTION_SUCCESSFUL",
          channels: ["IN_APP", "EMAIL", "SMS"],
          title: "Repayment Processed",
          message: `₵${amountDue.toFixed(2)} has been deducted for your RentVest repayment`,
          metadata: {
            amount: amountDue.toString(),
            instalmentNumber: installment.instalmentNumber,
            dueDate: installment.dueDate,
          },
        });

        // Audit log
        await auditService.log({
          userId: financingRequest.tenant.userId,
          action: "DEDUCTION_SUCCESSFUL",
          entity: "DeductionEvent",
          entityId: deductionEvent.id,
          metadata: {
            amount: amountDue.toString(),
            mandateId,
          },
        });

        // Check if financing is now fully repaid
        if (updatedInstallment.status === "PAID") {
          await this.checkFinancingCompletion(
            financingRequest.id,
            financingRequest.tenant.userId
          );
        }

        logger.info("Deduction successful", {
          requestId,
          deductionEventId: deductionEvent.id,
          amount: amountDue.toString(),
        });
      } else if (deductionStatus === "FAILED") {
        // Send failure notification
        await notificationService.send({
          userId: financingRequest.tenant.userId,
          type: "DEDUCTION_FAILED",
          channels: ["IN_APP", "EMAIL"],
          title: "Repayment Failed",
          message: `Could not process deduction: ${bankResponse.failureReason || "Unknown error"}. You will be retried on the next business day.`,
          metadata: {
            amount: amountDue.toString(),
            instalmentNumber: installment.instalmentNumber,
            reason: bankResponse.failureReason,
          },
        });

        logger.warn("Deduction failed - not retryable", {
          requestId,
          deductionEventId: deductionEvent.id,
          reason: bankResponse.failureReason,
        });
      } else if (deductionStatus === "RETRY_SCHEDULED") {
        logger.info("Deduction failed - retry scheduled", {
          requestId,
          deductionEventId: deductionEvent.id,
          nextRetry: updatedDeduction.nextRetryAt,
          reason: bankResponse.failureReason,
        });
      }

      return bankResponse;
    } catch (error) {
      logger.error("Deduction execution error", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        status: "FAILED",
        failureReason: "Unexpected error during deduction",
        retryable: true,
      };
    }
  }

  /**
   * Submit debit instruction to bank API
   * This is the bank integration point
   */
  private async submitBankDebitInstruction(
    request: BankDebitRequest
  ): Promise<BankDebitResponse> {
    // Development/sandbox mode
    if (!this.bankApiKey) {
      logger.info("Bank debit instruction (sandbox)", {
        mandateId: request.mandateId,
        amount: request.amount.toString(),
      });

      // Simulate 90% success rate in sandbox
      if (Math.random() > 0.1) {
        return {
          status: "SUCCESSFUL",
          bankReference: `SIM-${Date.now()}`,
          retryable: false,
        };
      } else {
        return {
          status: "FAILED",
          failureReason: "Simulated bank error",
          retryable: true,
        };
      }
    }

    try {
      // Production: Call bank API (e.g., GhipSS, Fidelity, etc.)
      const payload = {
        mandateId: request.mandateId,
        amount: request.amount.toFixed(2),
        currency: "GHS",
        description: request.description,
        reference: request.deductionEventId,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.bankApiUrl}/debit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.bankApiKey}`,
          "Content-Type": "application/json",
          "X-Request-ID": request.deductionEventId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Bank API error", {
          status: response.status,
          error: errorData,
        });

        return {
          status: "FAILED",
          failureReason: `Bank error: ${response.status}`,
          retryable: [408, 429, 500, 502, 503, 504].includes(response.status),
        };
      }

      const data = await response.json();
      return {
        status: data.status === "COMPLETED" ? "SUCCESSFUL" : "FAILED",
        bankReference: data.referenceId || data.transactionId,
        failureReason: data.errorMessage,
        retryable: data.retryable ?? false,
      };
    } catch (error) {
      logger.error("Bank API connection error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: "FAILED",
        failureReason: "Connection error",
        retryable: true,
      };
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   * Attempt 1: 1 hour, Attempt 2: 6 hours, Attempt 3: 24 hours
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const delays = [1, 6, 24]; // hours
    const delayHours = delays[Math.min(attemptNumber - 1, delays.length - 1)];
    const nextRetry = new Date();
    nextRetry.setHours(nextRetry.getHours() + delayHours);
    return nextRetry;
  }

  /**
   * Check if financing is fully repaid
   * If so, mark it as CLOSED and trigger settlement
   */
  private async checkFinancingCompletion(
    financingRequestId: string,
    tenantId: string
  ): Promise<void> {
    const financing = await prisma.financingRequest.findUnique({
      where: { id: financingRequestId },
      include: {
        repaymentPlan: {
          include: { installments: true },
        },
      },
    });

    if (!financing || !financing.repaymentPlan) return;

    const allInstallmentsPaid = financing.repaymentPlan.installments.every(
      (installment) =>
        installment.status === "PAID" || installment.status === "PARTIALLY_PAID"
    );

    if (allInstallmentsPaid) {
      await prisma.financingRequest.update({
        where: { id: financingRequestId },
        data: { status: "REPAYMENT_COMPLETED" },
      });

      // Trigger settlement payout
      // This would call settlementService.processSettlement()

      await notificationService.send({
        userId: tenantId,
        type: "FINANCING_COMPLETED",
        channels: ["IN_APP", "EMAIL"],
        title: "Financing Paid Off",
        message: "Congratulations! You have successfully completed your RentVest financing.",
        metadata: {
          financingRequestId,
        },
      });

      logger.info("Financing marked as completed", {
        financingRequestId,
      });
    }
  }

  /**
   * Batch retry failed deductions
   * Called by a scheduled job (e.g., daily at 2 AM)
   */
  async retryFailedDeductions(): Promise<void> {
    const requestId = `batch_retry_${Date.now()}`;

    try {
      // Find deductions eligible for retry
      const eligibleDeductions = await prisma.deductionEvent.findMany({
        where: {
          status: "RETRY_SCHEDULED",
          nextRetryAt: { lte: new Date() },
          attemptNumber: { lt: 5 }, // Max 5 attempts
        },
        include: {
          installment: true,
          mandate: true,
        },
      });

      logger.info("Starting batch retry of failed deductions", {
        requestId,
        count: eligibleDeductions.length,
      });

      for (const deduction of eligibleDeductions) {
        try {
          await this.executeDeduction(
            deduction.installmentId,
            deduction.mandateId,
            deduction.attemptNumber + 1
          );
        } catch (error) {
          logger.error("Error retrying deduction", {
            deductionId: deduction.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      logger.info("Batch retry completed", {
        requestId,
        processed: eligibleDeductions.length,
      });
    } catch (error) {
      logger.error("Batch retry error", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Poll mandate status from bank
   * Used to sync with external mandate lifecycle changes
   */
  async pollMandateStatus(mandateId: string): Promise<MandateStatus | null> {
    try {
      const mandate = await prisma.mandate.findUnique({
        where: { id: mandateId },
        include: { bankAccount: true },
      });

      if (!mandate) return null;

      if (!this.bankApiKey) {
        // Sandbox: return current status
        return mandate.status;
      }

      // Production: poll bank
      const response = await fetch(
        `${this.bankApiUrl}/mandates/${mandate.providerReference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.bankApiKey}`,
          },
        }
      );

      if (!response.ok) {
        logger.warn("Mandate status poll failed", {
          mandateId,
          status: response.status,
        });
        return mandate.status;
      }

      const data = await response.json();
      const bankStatus = data.status;

      // Map bank status to our enum
      if (
        bankStatus === "ACTIVE" &&
        mandate.status !== "ACTIVE"
      ) {
        await prisma.mandate.update({
          where: { id: mandateId },
          data: { status: "ACTIVE", activatedAt: new Date() },
        });
        return "ACTIVE";
      }

      if (
        bankStatus === "REVOKED" &&
        mandate.status !== "REVOKED"
      ) {
        await prisma.mandate.update({
          where: { id: mandateId },
          data: { status: "REVOKED", revokedAt: new Date() },
        });
        return "REVOKED";
      }

      if (
        bankStatus === "EXPIRED" &&
        mandate.status !== "EXPIRED"
      ) {
        await prisma.mandate.update({
          where: { id: mandateId },
          data: { status: "EXPIRED", expiresAt: new Date() },
        });
        return "EXPIRED";
      }

      return mandate.status;
    } catch (error) {
      logger.error("Mandate status poll error", {
        mandateId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }
}

export const mandateExecutionService = new MandateExecutionService();
