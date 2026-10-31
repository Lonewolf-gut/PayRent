import { getSession } from "next-auth/react";
import type { Session } from "next-auth";

/** NextAuth can set the cookie slightly after signIn resolves; retry before treating login as failed. */
export async function waitForClientSession(
  maxAttempts = 10
): Promise<Session | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await getSession();
    if (session?.user) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 75));
  }
  return null;
}
