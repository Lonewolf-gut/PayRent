import { describe, it, expect } from "vitest";
import { CommissionService } from "@/lib/services/commission.service";

describe("CommissionService", () => {
  const service = new CommissionService();

  it("calculates fees correctly", () => {
    const fees = service.calculateFees(1000);
    expect(fees.serviceFee).toBe(15);
    expect(fees.commissionFee).toBe(20);
    expect(fees.processingFee).toBe(5);
    expect(fees.totalFee).toBe(40);
  });
});
