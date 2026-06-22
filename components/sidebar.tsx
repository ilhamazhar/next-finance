"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { LayoutDashboard, CreditCard, Landmark, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/api/auth-store";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/financings", label: "Financings", icon: Landmark },
  { href: "/users", label: "Users", icon: Users },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clearSession);

  async function logout() {
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
        {links.map(({ href, label, icon: Icon }) => {
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
            <div className="font-medium text-[color:var(--color-foreground)] truncate">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </aside>
  );
}
