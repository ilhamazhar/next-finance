"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBackendStatus } from "@/lib/api/backend-status-store";

async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch("/api/health", { cache: "no-store" });
  if (!res.ok) return { status: "down" };
  return res.json();
}

/**
 * App-wide offline banner. Status is event-driven: real request failures flip
 * the store to "down" (see client.ts). While down — and ONLY while down — we
 * poll /api/health to detect recovery, so there is zero background traffic when
 * the backend is healthy.
 */
export function BackendStatusBanner() {
  const status = useBackendStatus((s) => s.status);
  const setStatus = useBackendStatus((s) => s.setStatus);

  const { data } = useQuery({
    queryKey: ["backend-health"],
    queryFn: fetchHealth,
    enabled: status === "down",
    refetchInterval: 5_000,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    // Any non-"down" health result means the backend is reachable again — clear
    // the banner. "degraded" (reachable but unhealthy) still counts as reachable.
    if (status === "down" && data && data.status !== "down") setStatus("up");
  }, [status, data, setStatus]);

  if (status === "up") return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Cannot reach the backend server. Some features may not work.
    </div>
  );
}
