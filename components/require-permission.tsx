"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCan, type Resource, type Action } from "@/lib/api/rbac";

/**
 * Page-level RBAC guard. Renders children only if the current session role may
 * perform `action` on `resource` (per the client-side policy mirror); otherwise
 * redirects. This runs inside the dashboard layout, which only mounts children
 * after the session — and thus the role — has resolved, so there's no flash of
 * protected content for an authenticated user.
 *
 * Backend authz still enforces this independently; the guard just avoids showing
 * a page whose API calls would 403.
 */
export function RequirePermission({
  resource,
  action,
  redirectTo = "/dashboard",
  children,
}: {
  resource: Resource;
  action: Action;
  redirectTo?: Route;
  children: ReactNode;
}) {
  const router = useRouter();
  const allowed = useCan(resource, action);

  useEffect(() => {
    if (!allowed) router.replace(redirectTo);
  }, [allowed, redirectTo, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
