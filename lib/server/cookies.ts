import "server-only";

import { cookies } from "next/headers";
import { env } from "./env";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export async function setRefreshCookie(refreshToken: string) {
  const jar = await cookies();
  jar.set(env.cookieName, refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  });
}

export async function getRefreshCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(env.cookieName)?.value ?? null;
}

export async function clearRefreshCookie() {
  const jar = await cookies();
  jar.delete(env.cookieName);
}
