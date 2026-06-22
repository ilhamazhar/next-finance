import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/**
 * Reports backend reachability for the offline banner. Never throws: a down
 * backend resolves to { status: "down" } rather than a 500, so the client can
 * distinguish "backend offline" from "this route errored".
 */
export async function GET() {
  try {
    const res = await fetch(`${env.backendUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return NextResponse.json({ status: "up" });
    return NextResponse.json({ status: "degraded", code: res.status }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "down" }, { status: 200 });
  }
}
