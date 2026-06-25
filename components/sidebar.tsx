"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { LayoutDashboard, CreditCard, Landmark, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/api/auth-store";
import { can, useRole, Resource, Action, type Resource as Res, type Action as Act } from "@/lib/api/rbac";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

// `require` gates a link behind a permission; links without it are shown to any
// authenticated role. Mirrors the backend's route authz (only /users is gated).
const links: ReadonlyArray<{
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  require?: { resource: Res; action: Act };
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/financings", label: "Financings", icon: Landmark },
  { href: "/users", label: "Users", icon: Users, require: { resource: Resource.Users, action: Action.Read } },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clearSession);
  const role = useRole();
  const visibleLinks = links.filter((l) => !l.require || can(role, l.require.resource, l.require.action));
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
    } finally {
      clear();
      router.push("/login");
    }
  }

  return (
    <aside className="w-64 shrink-0 border-r border-[color:var(--color-border)] p-4 flex flex-col gap-4">
      <div className="font-semibold text-lg px-2">Azhar Finance</div>
      <nav className="flex-1 flex flex-col gap-1">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-[color:var(--color-muted)] font-medium"
                  : "hover:bg-[color:var(--color-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[color:var(--color-border)] pt-4 space-y-2">
        {user && (
          <div className="text-xs px-2 text-[color:var(--color-muted-foreground)]">
            <div className="font-medium text-[color:var(--color-foreground)] truncate flex items-center gap-1.5">
              <span className="truncate">{user.name}</span>
              {role !== "user" && (
                <span className="shrink-0 rounded bg-[color:var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {role}
                </span>
              )}
            </div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setConfirmLogout(true)}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <Modal
        open={confirmLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
        title="Log out"
        description="You'll need to sign in again to access your account."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmLogout(false)}
            disabled={loggingOut}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </Modal>
    </aside>
  );
}
