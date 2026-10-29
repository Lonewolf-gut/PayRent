import { create } from "zustand";
import type { UserRole } from "@prisma/client";

interface AuthState {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
}));
