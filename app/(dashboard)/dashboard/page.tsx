"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { User } from "@/lib/schemas/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifiedBadge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/api/auth-store";
import { useCan, Resource, Action } from "@/lib/api/rbac";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canViewUsers = useCan(Resource.Users, Action.Read);
  const canCreateFinancing = useCan(Resource.Financings, Action.Create);
  const canCreatePayment = useCan(Resource.Payments, Action.Create);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<User>>("/api/me/");
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LayoutDashboard className="h-6 w-6" />
          Welcome{user?.name ? `, ${user.name}` : ""} 👋
        </h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Quick view of your account.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Loaded from /api/me</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {me.isLoading ? "Loading…" : me.data ? (
              <dl className="space-y-1">
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">ID</dt><dd className="font-mono text-xs">{me.data.id}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Name</dt><dd>{me.data.name}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Email</dt><dd>{me.data.email}</dd></div>
                <div className="flex justify-between items-center">
                  <dt className="text-[color:var(--color-muted-foreground)]">Status</dt>
                  <dd><VerifiedBadge verifiedAt={me.data.email_verified_at} /></dd>
                </div>
              </dl>
            ) : "No data"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Where to next?</CardDescription>
          </CardHeader>
          <CardContent className="text-sm flex flex-col gap-1">
            {canCreatePayment && (
              <a className="underline" href="/payments/new">→ Create a QRIS payment</a>
            )}
            <a className="underline" href="/payments">→ View payments by order ref</a>
            {canCreateFinancing && (
              <a className="underline" href="/financings/new">→ Open a Murabahah financing</a>
            )}
            <a className="underline" href="/financings">→ View financings &amp; schedules</a>
            {canViewUsers && (
              <a className="underline" href="/users">→ Manage users</a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
