import type { Prisma } from "@prisma/client";
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

  async logLogin(
    userId: string | null,
    success: boolean,
    ip?: string,
    userAgent?: string,
    email?: string
  ) {
    const data: Prisma.LoginLogCreateInput = {
      success,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      email: email?.trim().toLowerCase() ?? null,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    };

    try {
      return await prisma.loginLog.create({ data });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[LoginLog] create failed:", error);
      }

      if (!userId) {
        throw error;
      }

      return prisma.loginLog.create({
        data: {
          success,
          ipAddress: ip ?? null,
          userAgent: userAgent ?? null,
          user: { connect: { id: userId } },
        },
      });
    }
  }
}

export const auditService = new AuditService();
