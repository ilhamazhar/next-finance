"use client";

import { create } from "zustand";
import type { TokenPair } from "./types";

type AuthState = {
  accessToken: string | null;
  user: TokenPair["user"] | null;
  setSession: (s: { accessToken: string; user: TokenPair["user"] }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
