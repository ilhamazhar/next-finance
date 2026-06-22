"use client";

import { create } from "zustand";

type BackendStatus = "up" | "down";

type State = {
  status: BackendStatus;
  setStatus: (s: BackendStatus) => void;
};

/**
 * Tracks backend reachability. Driven by real request outcomes (see the axios
 * interceptors in client.ts), not by background polling: it flips to "down"
 * when a proxied call reports the backend is unreachable, and back to "up" on
 * the next successful response.
 */
export const useBackendStatus = create<State>((set) => ({
  status: "up",
  setStatus: (status) => set((prev) => (prev.status === status ? prev : { status })),
}));
