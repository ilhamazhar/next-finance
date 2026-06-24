"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Landmark } from "lucide-react";

import { api } from "@/lib/api/client";
import type { PaginatedEnvelope } from "@/lib/api/types";
import type { FinancingResponse } from "@/lib/schemas/financing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancingStatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { formatDate, formatIDR } from "@/lib/utils";

export default function FinancingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;

  const query = useQuery({
    queryKey: ["financings", page],
    queryFn: async () => {
      const res = await api.get<PaginatedEnvelope<FinancingResponse>>(
        `/api/financings?page=${page}&limit=${limit}`
      );
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Landmark className="h-6 w-6" />
            Financings
          </h1>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Murabahah (cost-plus) contracts and their installment schedules.
          </p>
        </div>
        <Link href="/financings/new"><Button>+ New financing</Button></Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
          <CardDescription>
            {query.data?.pagination
              ? `${query.data.pagination.total_items} total · page ${query.data.pagination.page}/${query.data.pagination.total_pages}`
              : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Failed to load financings"
              onRetry={() => query.refetch()}
            />
          ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  <th className="text-left py-2 px-2 font-medium">Asset</th>
                  <th className="text-left py-2 px-2 font-medium">Akad</th>
                  <th className="text-right py-2 px-2 font-medium">Total</th>
                  <th className="text-right py-2 px-2 font-medium">Tenor</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && (
                  <tr><td colSpan={6} className="py-6 text-center">Loading…</td></tr>
                )}
                {query.data?.data?.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-[color:var(--color-border)] last:border-0 cursor-pointer hover:bg-[color:var(--color-muted)]"
                    onClick={() => router.push(`/financings/${f.id}`)}
                  >
                    <td className="py-2 px-2 font-medium">{f.asset_name}</td>
                    <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">{f.akad_type}</td>
                    <td className="py-2 px-2 text-right">{formatIDR(f.total_price)}</td>
                    <td className="py-2 px-2 text-right">{f.tenor} mo</td>
                    <td className="py-2 px-2"><FinancingStatusBadge status={f.status} /></td>
                    <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">{formatDate(f.created_at)}</td>
                  </tr>
                ))}
                {query.data?.data?.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-[color:var(--color-muted-foreground)]">No financings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data || page >= (query.data.pagination?.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
