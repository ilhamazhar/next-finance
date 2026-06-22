"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/lib/api/auth-store";
import type { ApiEnvelope, TokenPair } from "@/lib/api/types";

/**
 * On first mount, swap the httpOnly refresh cookie for an access token in
 * memory. Resolves the auth status so guarded pages can render or redirect.
 */
export function useBootstrapSession() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean>(!!accessToken);

  useEffect(() => {
    let cancelled = false;
    if (accessToken) {
      setAuthed(true);
      setReady(true);
      return;
    }
    (async () => {
      try {
        const res = await axios.post<ApiEnvelope<Omit<TokenPair, "refresh_token">>>(
          "/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        if (cancelled) return;
        if (res.data.data) {
          setSession({ accessToken: res.data.data.access_token, user: res.data.data.user });
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, setSession]);

  return { ready, authed };
}
