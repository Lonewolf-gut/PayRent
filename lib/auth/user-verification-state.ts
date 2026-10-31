import type { Session } from "next-auth";
import { ensureDbConnection, prisma } from "@/lib/db/prisma";

export type UserVerificationState = {
  emailVerified: boolean;
  phoneVerified: boolean;
  databaseAvailable: boolean;
};

export async function getUserVerificationState(
  session: Session
): Promise<UserVerificationState> {
  const fallback: UserVerificationState = {
    emailVerified: Boolean(session.user.emailVerified),
    phoneVerified: Boolean(session.user.phoneVerified),
    databaseAvailable: false,
  };

  if (!session.user?.id) {
    return fallback;
  }

  try {
    await ensureDbConnection();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, phoneVerified: true },
    });

    if (!user) {
      return fallback;
    }

    return {
      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
      databaseAvailable: true,
    };
  } catch {
    return fallback;
  }
}
