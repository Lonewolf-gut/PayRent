import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { apiResponse, withAuth } from "@/lib/api/handler";

const bankSchema = z.object({
  bankName: z.string().min(2),
  accountNumber: z.string().min(8),
  accountName: z.string().min(2),
});

export const GET = withAuth(async (_req, _ctx, session) => {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      isVerified: true,
      isDefault: true,
      createdAt: true,
    },
  });
  return apiResponse(accounts);
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const parsed = bankSchema.safeParse(await req.json());
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  const encryptedData = encrypt(
    JSON.stringify({
      accountNumber: parsed.data.accountNumber,
      bankName: parsed.data.bankName,
    })
  );

  const account = await prisma.bankAccount.create({
    data: {
      userId: session.user.id,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber.slice(-4).padStart(
        parsed.data.accountNumber.length,
        "*"
      ),
      accountName: parsed.data.accountName,
      encryptedData,
      isVerified: false,
    },
  });

  return apiResponse(account, 201);
});
