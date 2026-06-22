import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { setRefreshCookie } from "@/lib/server/cookies";
import type { ApiEnvelope, TokenPair } from "@/lib/api/types";

export async function POST(req: Request) {
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${env.backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Backend server is unreachable." },
      { status: 503 }
    );
  }

  const payload = (await upstream.json()) as ApiEnvelope<TokenPair>;

  if (!upstream.ok || !payload.data) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  await setRefreshCookie(payload.data.refresh_token);

  // Strip refresh_token from the body so it never reaches the browser
  const { refresh_token: _rt, ...safe } = payload.data;
  return NextResponse.json({ ...payload, data: safe }, { status: 200 });
}
