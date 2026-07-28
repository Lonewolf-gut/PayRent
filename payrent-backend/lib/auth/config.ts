import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import type { UserRole } from "@prisma/client";
import { authenticateCredentials } from "@/lib/auth/credentials-login";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      image?: string | null;
      twoFactorEnabled: boolean;
      emailVerified: boolean;
      phoneVerified: boolean;
    };
  }

  interface User {
    role: UserRole;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    picture?: string | null;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
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
      async authorize(credentials, request) {
        const user = await authenticateCredentials(
          String(credentials?.email ?? ""),
          String(credentials?.password ?? ""),
          credentials?.otp ? String(credentials.otp) : undefined,
          request
        );

        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          image: user.image,
          twoFactorEnabled: user.twoFactorEnabled,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.emailVerified = Boolean(user.emailVerified);
        token.phoneVerified = Boolean(user.phoneVerified);
        token.picture = user.image ?? null;

        const now = Math.floor(Date.now() / 1000);
        token.iat = now;
        token.exp = now + sessionMaxAgeSeconds;

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
              phoneVerified: true,
              twoFactorEnabled: true,
            },
          });
          if (dbUser) {
            token.picture = dbUser.image;
            token.email = dbUser.email;
            token.emailVerified = Boolean(dbUser.emailVerified);
            token.phoneVerified = Boolean(dbUser.phoneVerified);
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
        (session.user as Session["user"]).phoneVerified = Boolean(token.phoneVerified);
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
