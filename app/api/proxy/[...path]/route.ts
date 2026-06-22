import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/server/env";

type Params = { path: string[] };

async function forward(req: NextRequest, params: Promise<Params>) {
  const { path } = await params;
  const search = req.nextUrl.search;
  const upstreamUrl = `${env.backendUrl}/${path.join("/")}${search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch {
    // Backend unreachable (refused/timeout/DNS). Return a clean envelope so the
    // client surfaces "backend offline" instead of an opaque 500.
    return NextResponse.json(
      { success: false, message: "Backend server is unreachable." },
      { status: 503 }
    );
  }

  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  return forward(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  return forward(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<Params> }) {
  return forward(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  return forward(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
  return forward(req, ctx.params);
}
