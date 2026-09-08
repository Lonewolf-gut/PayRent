import type { Session } from "next-auth";

export type UserVerificationState = {
  emailVerified: boolean;
  phoneVerified: boolean;
  databaseAvailable: boolean;
};

export async function getUserVerificationState(
  session: Session
): Promise<UserVerificationState> {
  return {
    emailVerified: Boolean(session.user?.emailVerified),
    phoneVerified: Boolean(session.user?.phoneVerified),
    databaseAvailable: true,
  };
}
