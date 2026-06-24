"use client";

import { useAuthStore } from "./auth-store";
import type { Role } from "./types";

/**
 * Client-side mirror of the backend Casbin RBAC policy (Go: pkg/authz/authz.go).
 *
 * This is UX only — it hides/guards what the server already refuses. The Go
 * middleware (internal/middleware/authz.go) remains the real authority; never
 * trust this for actual access control. Keep the matrix below in sync with the
 * backend's defaultPolicies so the UI matches what the API will allow.
 */

// Resources — objects an action targets. Mirrors authz.Resource* consts.
export const Resource = {
  Profile: "profile",
  Users: "users",
  Financings: "financings",
  Payments: "payments",
} as const;
export type Resource = (typeof Resource)[keyof typeof Resource];

// Actions — verbs. Mirrors authz.Action* consts.
export const Action = {
  Create: "create",
  Read: "read",
  Update: "update",
  Delete: "delete",
  Sign: "sign",
  Pay: "pay",
} as const;
export type Action = (typeof Action)[keyof typeof Action];

type Policy = readonly [Resource, Action | "*"];

// Permissions granted to the base "user" role. admin inherits all of these
// (the backend establishes admin -> user role inheritance).
const userPolicies: readonly Policy[] = [
  [Resource.Profile, Action.Read],
  [Resource.Profile, Action.Update],
  [Resource.Financings, Action.Create],
  [Resource.Financings, Action.Read],
  [Resource.Financings, Action.Sign],
  [Resource.Financings, Action.Pay],
  [Resource.Payments, Action.Create],
  [Resource.Payments, Action.Read],
];

// Permissions granted to "admin" only (on top of the inherited user policies).
// "*" mirrors the backend's ActionAny wildcard: full control of the resource.
const adminPolicies: readonly Policy[] = [
  [Resource.Users, "*"],
];

function granted(policies: readonly Policy[], resource: Resource, action: Action): boolean {
  return policies.some(([obj, act]) => obj === resource && (act === action || act === "*"));
}

/**
 * Pure permission check, mirroring Casbin's Enforce(role, obj, act). A missing
 * role is treated as "user" — same as the backend, which defaults tokens issued
 * before roles existed to the base user role.
 */
export function can(role: Role | null | undefined, resource: Resource, action: Action): boolean {
  const effective: Role = role === "admin" ? "admin" : "user";
  // Both roles get the user policies (admin inherits user).
  if (granted(userPolicies, resource, action)) return true;
  // Admin additionally gets the admin-only policies.
  if (effective === "admin" && granted(adminPolicies, resource, action)) return true;
  return false;
}

// --- React hooks ----------------------------------------------------------

/** Current session role, defaulting to "user" when absent. */
export function useRole(): Role {
  const role = useAuthStore((s) => s.user?.role);
  return role === "admin" ? "admin" : "user";
}

export function useIsAdmin(): boolean {
  return useRole() === "admin";
}

/** Reactive permission check bound to the current session role. */
export function useCan(resource: Resource, action: Action): boolean {
  const role = useRole();
  return can(role, resource, action);
}
