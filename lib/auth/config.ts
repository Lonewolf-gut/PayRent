import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma, ensureDbConnection } from "@/lib/db/prisma";
import type { UserRole } from "@prisma/client";
import {
  AccountLockedError,
  AccountSuspendedError,
  EmailNotFoundError,
  InvalidPasswordError,
  InvalidTwoFactorError,
  MissingCredentialsError,
  TwoFactorRequiredError,
  DatabaseUnavailableError,
} from "@/lib/auth/sign-in-errors";
import { logLoginAttempt } from "@/lib/auth/login-log";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      image?: string | null;
      twoFactorEnabled: boolean;
      emailVerified: boolean;
    };
  }

  interface User {
    role: UserRole;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    picture?: string | null;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 15 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new MissingCredentialsError();
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        try {
          await ensureDbConnection();
        } catch {
          throw new DatabaseUnavailableError();
        }

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch {
          throw new DatabaseUnavailableError();
        }

        if (!user) {
          throw new EmailNotFoundError();
        }

        if (!user.isActive) {
          await logLoginAttempt(user.id, false);
          throw new AccountSuspendedError();
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logLoginAttempt(user.id, false);
          throw new AccountLockedError();
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failedCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failedCount,
              lockedUntil:
                failedCount >= 5
                  ? new Date(Date.now() + 30 * 60 * 1000)
                  : undefined,
            },
          });
          await logLoginAttempt(user.id, false);
          if (failedCount >= 5) {
            throw new AccountLockedError();
          }
          throw new InvalidPasswordError();
        }

        if (user.twoFactorEnabled) {
          if (!credentials.otp) {
            throw new TwoFactorRequiredError();
          }

          const { twoFactorService } = await import("@/lib/services/two-factor.service");
          try {
            await twoFactorService.validateToken(user.id, String(credentials.otp));
          } catch {
            await logLoginAttempt(user.id, false);
            throw new InvalidTwoFactorError();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });

        await logLoginAttempt(user.id, true);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          image: user.image,
          twoFactorEnabled: user.twoFactorEnabled,
          emailVerified: Boolean(user.emailVerified),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.emailVerified = Boolean(user.emailVerified);
        token.picture = user.image ?? null;

        void import("@/lib/services/verification-reminder.service")
          .then(({ verificationReminderService }) =>
            verificationReminderService.notifyIfUnverified(user.id!, user.role)
          )
          .catch(() => undefined);
      }

      if (trigger === "update") {
        if (session?.user && "image" in session.user) {
          token.picture = session.user.image ?? null;
        }
        if (token.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              image: true,
              email: true,
              emailVerified: true,
              twoFactorEnabled: true,
            },
          });
          if (dbUser) {
            token.picture = dbUser.image;
            token.email = dbUser.email;
            token.emailVerified = Boolean(dbUser.emailVerified);
            token.twoFactorEnabled = dbUser.twoFactorEnabled;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.image = (token.picture as string | null | undefined) ?? null;
        (session.user as Session["user"]).emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
