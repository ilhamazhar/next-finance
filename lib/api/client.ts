"use client";

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "./auth-store";
import { useBackendStatus } from "./backend-status-store";
import type { ApiEnvelope, TokenPair } from "./types";

/**
 * Browser-side API client. Talks ONLY to /api/proxy/* (same-origin), which
 * forwards to the Go backend server-side and attaches the access token from
 * the httpOnly refresh cookie when needed. The refresh token never reaches JS.
 */
export const api: AxiosInstance = axios.create({
  baseURL: "/api/proxy",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await axios.post<ApiEnvelope<TokenPair>>(
        "/api/auth/refresh",
        {},
        { withCredentials: true }
      );
      const data = res.data.data;
      if (!data) return null;
      useBackendStatus.getState().setStatus("up");
      useAuthStore.getState().setSession({ accessToken: data.access_token, user: data.user });
      return data.access_token;
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      if (status === 503 || !(err as AxiosError).response) {
        // Backend unreachable — keep the session; it may refresh once it's back.
        useBackendStatus.getState().setStatus("down");
        return null;
      }
      useAuthStore.getState().clearSession();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

api.interceptors.response.use(
  (r) => {
    // Any successful round-trip proves the backend is reachable again.
    useBackendStatus.getState().setStatus("up");
    return r;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    // 503 = proxy reports backend unreachable; no response = network failure.
    // Either way the backend is effectively down.
    if (status === 503 || !error.response) {
      useBackendStatus.getState().setStatus("down");
    } else {
      useBackendStatus.getState().setStatus("up");
    }

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers?.set?.("Authorization", `Bearer ${newToken}`);
        return api.request(original);
      }
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);
