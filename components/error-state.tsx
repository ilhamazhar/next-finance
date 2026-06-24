"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import axios from "axios";
import { ArrowLeft, RotateCw, ShieldX, SearchX, LogIn, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** HTTP status of a failed request, if it was an HTTP error (vs. network). */
export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

type Variant = { title: string; description: string; icon: typeof ShieldX };

// Friendly copy per status. Anything not listed falls through to a generic
// message (optionally enriched with the backend's `message`).
const byStatus: Record<number, Variant> = {
  401: {
    title: "Session expired",
    description: "You're not signed in, or your session ended. Sign in again to continue.",
    icon: LogIn,
  },
  403: {
    title: "Access denied",
    description: "You don't have permission to view this. Ask an admin if you think that's wrong.",
    icon: ShieldX,
  },
  404: {
    title: "Not found",
    description: "We couldn't find this — it may have been removed, or the link is wrong.",
    icon: SearchX,
  },
};

function resolve(error: unknown, fallbackTitle: string): Variant & { status?: number } {
  const status = httpStatus(error);
  if (status && byStatus[status]) return { status, ...byStatus[status] };

  // No response at all → the backend was unreachable.
  if (!status) {
    return {
      status,
      title: "Backend unreachable",
      description: "Couldn't reach the server. Check your connection and try again.",
      icon: TriangleAlert,
    };
  }

  const serverMsg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
  return {
    status,
    title: fallbackTitle,
    description: serverMsg ?? "Something went wrong. Please try again.",
    icon: TriangleAlert,
  };
}

/**
 * Status-aware error panel for failed data fetches. Always offers a "Go back"
 * action (history back, or `backHref` if given); pass `onRetry` to also show a
 * Retry button. 401 swaps Go back for a Sign in action since there's nowhere
 * useful to go back to.
 */
export function ErrorState({
  error,
  title = "Something went wrong",
  onRetry,
  backHref,
  className,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  backHref?: Route;
  className?: string;
}) {
  const router = useRouter();
  const { status, title: t, description, icon: Icon } = resolve(error, title);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-[color:var(--color-border)] p-8 text-center",
        className
      )}
      role="alert"
    >
      <div className="rounded-full bg-[color:var(--color-muted)] p-3">
        <Icon className="h-6 w-6 text-[color:var(--color-muted-foreground)]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t}</h2>
        {status && (
          <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">Error {status}</p>
        )}
        <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">{description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {status === 401 ? (
          <Button onClick={() => router.push("/login")}>
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        ) : (
          <Button variant="outline" onClick={() => (backHref ? router.push(backHref) : router.back())}>
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
        )}
        {onRetry && status !== 401 && (
          <Button variant={status === 403 || status === 404 ? "outline" : "default"} onClick={onRetry}>
            <RotateCw className="h-4 w-4" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
