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

// Per-role permission matrix, mirroring the backend's defaultPolicies.
//   - user:  self-service + financing/payment actions on their OWN records
//   - staff: read-only oversight across ALL users (no master-data/contract writes)
//   - admin: full user administration; inherits "user" via `inherits` below
// "*" mirrors the backend's ActionAny wildcard.
const policies: Record<Role, readonly Policy[]> = {
  user: [
    [Resource.Profile, Action.Read],
    [Resource.Profile, Action.Update],
    [Resource.Financings, Action.Create],
    [Resource.Financings, Action.Read],
    [Resource.Financings, Action.Sign],
    [Resource.Financings, Action.Pay],
    [Resource.Payments, Action.Create],
    [Resource.Payments, Action.Read],
  ],
  staff: [
    [Resource.Profile, Action.Read],
    [Resource.Profile, Action.Update],
    [Resource.Users, Action.Read],
    [Resource.Financings, Action.Read],
    [Resource.Payments, Action.Read],
  ],
  admin: [
    [Resource.Users, "*"],
  ],
};

// Role inheritance, mirroring Casbin's grouping policy. Only admin -> user;
// staff is standalone (it deliberately does NOT inherit the user write actions).
const inherits: Record<Role, readonly Role[]> = {
  admin: ["user"],
  staff: [],
  user: [],
};

// Effective policies for a role = its own policies plus those of every role it
// (transitively) inherits.
function effectivePolicies(role: Role): readonly Policy[] {
  const seen = new Set<Role>();
  const out: Policy[] = [];
  const stack: Role[] = [role];
  while (stack.length) {
    const r = stack.pop()!;
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(...policies[r]);
    stack.push(...inherits[r]);
  }
  return out;
}

// Normalize an unknown/missing role to "user" — same default the backend applies
// to tokens issued before roles existed.
function normalizeRole(role: Role | null | undefined): Role {
  return role === "admin" || role === "staff" ? role : "user";
}

/**
 * Pure permission check, mirroring Casbin's Enforce(role, obj, act).
 */
export function can(role: Role | null | undefined, resource: Resource, action: Action): boolean {
  return effectivePolicies(normalizeRole(role)).some(
    ([obj, act]) => obj === resource && (act === action || act === "*")
  );
}

/**
 * Whether a role may read other users' records (financings, payments) — i.e.
 * the backend's domain.CanViewAllResources. Admin and staff have cross-user
 * read access for oversight; a plain user is scoped to their own rows.
 */
export function canViewAllResources(role: Role | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "admin" || r === "staff";
}

// --- React hooks ----------------------------------------------------------

/** Current session role, defaulting to "user" when absent or unknown. */
export function useRole(): Role {
  const role = useAuthStore((s) => s.user?.role);
  return normalizeRole(role);
}

export function useIsAdmin(): boolean {
  return useRole() === "admin";
}

/** Whether the current role may read across all users (admin or staff). */
export function useCanViewAll(): boolean {
  return canViewAllResources(useRole());
}

/** Reactive permission check bound to the current session role. */
export function useCan(resource: Resource, action: Action): boolean {
  const role = useRole();
  return can(role, resource, action);
}
