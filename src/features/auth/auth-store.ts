import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

import type { Database } from "@/shared/api/database.types";

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role"
>;

export type UserRole = Profile["role"];

export const USER_ROLE = {
  MANAGER: "manager",
  EXECUTOR: "executor",
} as const satisfies Record<string, UserRole>;

type AuthStore = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
};

export const useAuthStore = create<AuthStore>(() => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
}));
