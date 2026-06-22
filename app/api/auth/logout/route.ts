import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { clearRefreshCookie, getRefreshCookie } from "@/lib/server/cookies";

export async function POST() {
  const rt = await getRefreshCookie();
  if (rt) {
    try {
      await fetch(`${env.backendUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
        cache: "no-store",
      });
    } catch {
      // best-effort — clear cookie either way
    }
  }
  await clearRefreshCookie();
  return NextResponse.json({ success: true, message: "logged out" });
}
