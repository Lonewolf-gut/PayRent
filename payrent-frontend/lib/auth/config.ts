import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import { apiUrl } from "@/lib/api/client";
import {
  AccountLockedError,
  AccountSuspendedError,
  DatabaseUnavailableError,
  EmailNotFoundError,
  InvalidPasswordError,
  InvalidTwoFactorError,
  MissingCredentialsError,
  TwoFactorRequiredError,
} from "@/lib/auth/sign-in-errors";

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

function throwForCode(code: string): never {
  switch (code) {
    case "missing_credentials":
      throw new MissingCredentialsError();
    case "email_not_found":
      throw new EmailNotFoundError();
    case "invalid_password":
      throw new InvalidPasswordError();
    case "account_suspended":
      throw new AccountSuspendedError();
    case "account_locked":
      throw new AccountLockedError();
    case "two_factor_required":
      throw new TwoFactorRequiredError();
    case "invalid_two_factor":
      throw new InvalidTwoFactorError();
    case "database_unavailable":
      throw new DatabaseUnavailableError();
    default:
      throw new InvalidPasswordError();
  }
}

export const authConfig: NextAuthConfig = {
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new MissingCredentialsError();
        }

        const response = await fetch(apiUrl("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            otp: credentials.otp,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          data?: {
            user?: {
              id: string;
              email: string;
              role: UserRole;
              image: string | null;
              twoFactorEnabled: boolean;
              emailVerified: boolean;
              phoneVerified: boolean;
            };
          };
          errors?: Array<{ code?: string }>;
        };

        if (!response.ok || !payload.success || !payload.data?.user) {
          throwForCode(payload.errors?.[0]?.code ?? "invalid_password");
        }

        const user = payload.data!.user!;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
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
      }

      if (trigger === "update") {
        if (session?.user && "image" in session.user) {
          token.picture = session.user.image ?? null;
        }
        if (session?.user && "emailVerified" in session.user) {
          token.emailVerified = Boolean(session.user.emailVerified);
        }
        if (session?.user && "phoneVerified" in session.user) {
          token.phoneVerified = Boolean(session.user.phoneVerified);
        }
        if (session?.user && "twoFactorEnabled" in session.user) {
          token.twoFactorEnabled = Boolean(session.user.twoFactorEnabled);
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
