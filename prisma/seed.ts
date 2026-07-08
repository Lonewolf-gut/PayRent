import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.wallet.upsert({
    where: { id: "platform-wallet" },
    update: {},
    create: {
      id: "platform-wallet",
      type: "PLATFORM",
      balance: 0,
      currency: "GHS",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@payforme.com" },
    update: {},
    create: {
      email: "admin@payforme.com",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
      isActive: true,
    },
  });

  const tenantUser = await prisma.user.upsert({
    where: { email: "tenant@payforme.com" },
    update: {},
    create: {
      email: "tenant@payforme.com",
      passwordHash,
      role: "BUYER",
      emailVerified: new Date(),
      phone: "+233200000001",
      phoneVerified: new Date(),
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { userId: tenantUser.id },
    update: {},
    create: {
      userId: tenantUser.id,
      fullName: "Demo Tenant",
      employmentStatus: "EMPLOYED",
      monthlyIncome: 5000,
      kycVerified: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: "demo-sub" },
    update: {},
    create: {
      id: "demo-sub",
      userId: tenantUser.id,
      plan: "FREE",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
    },
  });

  const landlordUser = await prisma.user.upsert({
    where: { email: "landlord@payforme.com" },
    update: {},
    create: {
      email: "landlord@payforme.com",
      passwordHash,
      role: "MERCHANT",
      emailVerified: new Date(),
    },
  });

  const landlord = await prisma.landlord.upsert({
    where: { userId: landlordUser.id },
    update: {},
    create: {
      userId: landlordUser.id,
      fullName: "Demo Landlord",
      identityVerified: true,
    },
  });

  const lenderUser = await prisma.user.upsert({
    where: { email: "lender@payforme.com" },
    update: {},
    create: {
      email: "lender@payforme.com",
      passwordHash,
      role: "LENDER",
      emailVerified: new Date(),
    },
  });

  await prisma.lender.upsert({
    where: { userId: lenderUser.id },
    update: {},
    create: {
      userId: lenderUser.id,
      fullName: "Demo Lender",
      institutionName: "Demo Finance Ghana",
      kycVerified: true,
      identityVerified: true,
      profileStatus: "PROFILE_COMPLETED",
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@payforme.com" },
    update: {},
    create: {
      email: "agent@payforme.com",
      passwordHash,
      role: "MARKETER",
      emailVerified: new Date(),
    },
  });

  await prisma.agentProfile.upsert({
    where: { userId: agentUser.id },
    update: {},
    create: {
      userId: agentUser.id,
      fullName: "Demo Marketer",
      agencyName: "Accra Property Partners",
      region: "Greater Accra",
      profileStatus: "PROFILE_COMPLETED",
    },
  });

  const complianceUser = await prisma.user.upsert({
    where: { email: "compliance@payforme.com" },
    update: { role: "COMPLIANCE_OFFICER" },
    create: {
      email: "compliance@payforme.com",
      passwordHash,
      role: "COMPLIANCE_OFFICER",
      emailVerified: new Date(),
      isActive: true,
    },
  });

  for (const [userId, type] of [
    [tenantUser.id, "BUYER"],
    [landlordUser.id, "MERCHANT"],
    [lenderUser.id, "LENDER"],
    [agentUser.id, "MARKETER"],
  ] as const) {
    const existing = await prisma.wallet.findFirst({
      where: { userId, type },
    });
    if (!existing) {
      await prisma.wallet.create({
        data: { userId, type, balance: 10000, currency: "GHS" },
      });
    }
  }

  const existingProperty = await prisma.property.findFirst({
    where: { landlordId: landlord.id },
  });

  if (!existingProperty) {
    const agentProfile = await prisma.agentProfile.findUnique({
      where: { userId: agentUser.id },
    });

    await prisma.property.create({
      data: {
        landlordId: landlord.id,
        agentUserId: agentProfile?.id,
        name: "Modern 2BR Apartment - East Legon",
        propertyType: "APARTMENT",
        region: "Greater Accra",
        city: "Accra",
        area: "East Legon",
        monthlyRent: 3500,
        annualRent: 42000,
        location: "East Legon, Accra",
        latitude: 5.635,
        longitude: -0.17,
        description:
          "Spacious 2-bedroom apartment with modern finishes, 24/7 security, and parking. Close to shopping and business districts.",
        amenities: ["Parking", "Security", "AC", "Balcony", "Gym"],
        status: "ACTIVE",
        isPremium: true,
        images: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
              order: 0,
            },
          ],
        },
        agent: {
          create: {
            name: "Kwame Asante",
            phone: "+233244000000",
            email: "kwame@payforme.com",
          },
        },
      },
    });
  }

  console.log("Seed completed:", {
    admin: admin.email,
    buyer: tenantUser.email,
    merchant: landlordUser.email,
    marketer: agentUser.email,
    lender: lenderUser.email,
    compliance: complianceUser.email,
  });
  console.log("Demo password for all: Password123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
