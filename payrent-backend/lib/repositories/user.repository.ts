import { prisma } from "@/lib/db/prisma";
import type { UserRole, Prisma } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { tenant: true, landlord: true, lender: true },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { tenant: true, landlord: true, lender: true },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  async listByRole(role: UserRole, skip = 0, take = 20) {
    return prisma.user.findMany({
      where: { role },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        image: true,
      },
    });
  }

  async countByRole(role?: UserRole) {
    return prisma.user.count({ where: role ? { role } : undefined });
  }

  async deleteById(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();
