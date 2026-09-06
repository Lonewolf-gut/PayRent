import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@payforme.com" },
    select: { email: true, role: true, isActive: true, lockedUntil: true, failedLoginCount: true },
  });
  console.log(JSON.stringify(admin, null, 2));
}

main()
  .catch((e) => {
    console.error("DB_ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
