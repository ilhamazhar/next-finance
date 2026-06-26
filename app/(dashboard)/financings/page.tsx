"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Search } from "lucide-react";

import { api } from "@/lib/api/client";
import type { PaginatedEnvelope } from "@/lib/api/types";
import type { FinancingResponse } from "@/lib/schemas/financing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancingStatusBadge } from "@/components/ui/badge";
import { SortableHeader, type SortOrder } from "@/components/ui/sortable-header";
import { ErrorState } from "@/components/error-state";
import { useCanViewAll, useCan, Resource, Action } from "@/lib/api/rbac";
import { formatDate, formatIDR } from "@/lib/utils";

// Sort keys the backend accepts (see financingSortColumns in the Go repo).
type SortKey = "asset_name" | "akad_type" | "total" | "tenor" | "status" | "created_at" | "owner";

export default function FinancingsPage() {
  const router = useRouter();
  // Admin & staff lists span every user, so the owner column is meaningful;
  // a plain user's list is entirely their own.
  const showOwner = useCanViewAll();
  const canCreate = useCan(Resource.Financings, Action.Create);
  const [page, setPage] = useState(1);
  const limit = 10;
  const cols = showOwner ? 7 : 6;

  // Debounce the search box so we don't fire a request per keystroke; the
  // backend filters by asset name across all financings (not just this page).
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // a new search starts from the first page
    }, 1500);
    return () => clearTimeout(t);
  }, [search]);

  // Column sorting. Newest-first by default, matching the backend fallback.
  const [sort, setSort] = useState<SortKey>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");
  // Click a header: toggle direction if it's the active column, else switch to
  // it. Text columns read most naturally ascending; numeric/created descending.
  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(
        key === "asset_name" || key === "akad_type" || key === "status" || key === "owner"
          ? "asc"
          : "desc"
      );
    }
    setPage(1);
  };

  const query = useQuery({
    queryKey: ["financings", page, debouncedSearch, sort, order],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await api.get<PaginatedEnvelope<FinancingResponse>>(
        `/api/financings?${params.toString()}`
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
        {canCreate && <Link href="/financings/new"><Button>+ New financing</Button></Link>}
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
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
            <Input
              type="search"
              placeholder="Search by asset or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Search financings"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  <SortableHeader label="Asset" sortKey="asset_name" sort={sort} order={order} onSort={toggleSort} />
                  {showOwner && <SortableHeader label="Owner" sortKey="owner" sort={sort} order={order} onSort={toggleSort} />}
                  <SortableHeader label="Akad" sortKey="akad_type" sort={sort} order={order} onSort={toggleSort} />
                  <SortableHeader label="Total" sortKey="total" sort={sort} order={order} onSort={toggleSort} align="right" />
                  <SortableHeader label="Tenor" sortKey="tenor" sort={sort} order={order} onSort={toggleSort} align="right" />
                  <SortableHeader label="Status" sortKey="status" sort={sort} order={order} onSort={toggleSort} />
                  <SortableHeader label="Created" sortKey="created_at" sort={sort} order={order} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {query.isLoading && (
                  <tr><td colSpan={cols} className="py-6 text-center">Loading…</td></tr>
                )}
                {query.data?.data?.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-[color:var(--color-border)] last:border-0 cursor-pointer hover:bg-[color:var(--color-muted)]"
                    onClick={() => router.push(`/financings/${f.id}`)}
                  >
                    <td className="py-2 px-2 font-medium">{f.asset_name}</td>
                    {showOwner && (
                      <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">
                        {f.user_name ?? "—"}
                      </td>
                    )}
                    <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">{f.akad_type}</td>
                    <td className="py-2 px-2 text-right">{formatIDR(f.total_price)}</td>
                    <td className="py-2 px-2 text-right">{f.tenor} mo</td>
                    <td className="py-2 px-2"><FinancingStatusBadge status={f.status} /></td>
                    <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">{formatDate(f.created_at)}</td>
                  </tr>
                ))}
                {query.data?.data?.length === 0 && (
                  <tr><td colSpan={cols} className="py-6 text-center text-[color:var(--color-muted-foreground)]">
                    {debouncedSearch ? `No financings match “${debouncedSearch}”` : "No financings yet"}
                  </td></tr>
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
