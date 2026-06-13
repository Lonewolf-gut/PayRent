import { prisma } from "@/lib/db/prisma";

export class AuditService {
  async log(params: {
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata as object,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async logLogin(userId: string, success: boolean, ip?: string, userAgent?: string) {
    return prisma.loginLog.create({
      data: { userId, success, ipAddress: ip, userAgent },
    });
  }
}

export const auditService = new AuditService();
