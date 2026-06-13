import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      image?: string | null;
      twoFactorEnabled: boolean;
    };
  }

  interface User {
    role: UserRole;
    twoFactorEnabled: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    twoFactorEnabled: boolean;
  }
}
