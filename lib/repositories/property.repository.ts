import { prisma } from "@/lib/db/prisma";
import type { Prisma, PropertyStatus } from "@prisma/client";
import type { PropertyFilterInput } from "@/lib/validations/property";

export class PropertyRepository {
  async findById(id: string) {
    return prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        videos: true,
        agent: true,
        landlord: { include: { user: { select: { email: true, image: true } } } },
      },
    });
  }

  async findMany(filters: PropertyFilterInput) {
    const { search, propertyType, minRent, maxRent, location, page, limit } =
      filters;
    const searchType = search?.trim().toUpperCase();
    const searchPropertyType =
      searchType &&
      ["APARTMENT", "HOUSE", "CONDO", "TOWNHOUSE", "STUDIO", "COMMERCIAL"].includes(searchType)
        ? searchType
        : undefined;

    const where: Prisma.PropertyWhereInput = {
      status: "ACTIVE",
      ...(propertyType && { propertyType: propertyType as Prisma.EnumPropertyTypeFilter }),
      ...(minRent && { monthlyRent: { gte: minRent } }),
      ...(maxRent && { monthlyRent: { lte: maxRent } }),
      ...(location && {
        location: { contains: location, mode: "insensitive" },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          ...(searchPropertyType ? [{ propertyType: searchPropertyType as Prisma.EnumPropertyTypeFilter }] : []),
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { take: 1, orderBy: { order: "asc" } },
          agent: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
      }),
      prisma.property.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(data: Prisma.PropertyCreateInput) {
    return prisma.property.create({
      data,
      include: { images: true, videos: true, agent: true },
    });
  }

  async update(id: string, data: Prisma.PropertyUpdateInput) {
    return prisma.property.update({
      where: { id },
      data,
      include: { images: true, videos: true, agent: true },
    });
  }

  async delete(id: string) {
    return prisma.property.delete({ where: { id } });
  }

  async findByLandlord(landlordId: string) {
    return prisma.property.findMany({
      where: { landlordId },
      include: { images: { orderBy: { order: "asc" } }, videos: true, agent: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: PropertyStatus) {
    return prisma.property.update({ where: { id }, data: { status } });
  }
}

export const propertyRepository = new PropertyRepository();
