import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from "@/lib/server/cookies";
import type { ApiEnvelope, TokenPair } from "@/lib/api/types";

export async function POST() {
  const rt = await getRefreshCookie();
  if (!rt) {
    return NextResponse.json({ success: false, message: "no refresh token" }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${env.backendUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
      cache: "no-store",
    });
  } catch {
    // Backend unreachable: do NOT clear the cookie — the session may still be
    // valid once the backend returns. Signal "down" so the client can react.
    return NextResponse.json(
      { success: false, message: "Backend server is unreachable." },
      { status: 503 }
    );
  }

  const payload = (await upstream.json()) as ApiEnvelope<TokenPair>;

  if (!upstream.ok || !payload.data) {
    await clearRefreshCookie();
    return NextResponse.json(payload, { status: upstream.status });
  }

  await setRefreshCookie(payload.data.refresh_token);
  const { refresh_token: _rt, ...safe } = payload.data;
  return NextResponse.json({ ...payload, data: safe }, { status: 200 });
}
