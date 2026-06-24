"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { CreditCard } from "lucide-react";

import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { PaymentStatusResponse } from "@/lib/schemas/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { useCan, Resource, Action } from "@/lib/api/rbac";
import { formatDate, formatIDR } from "@/lib/utils";

function PaymentsView() {
  const params = useSearchParams();
  const router = useRouter();
  const queryRef = params.get("ref") ?? "";
  const [orderRef, setOrderRef] = useState(queryRef);
  // Staff can look up payments (read) but not create them.
  const canCreate = useCan(Resource.Payments, Action.Create);

  const status = useQuery({
    queryKey: ["payment-status", queryRef],
    enabled: queryRef.length > 0,
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaymentStatusResponse>>(
        `/api/payments/${encodeURIComponent(queryRef)}`
      );
      return res.data.data!;
    },
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "PENDING" ? 3000 : false;
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CreditCard className="h-6 w-6" />
            Payments
          </h1>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Look up an order by reference.
          </p>
        </div>
        {canCreate && <Link href="/payments/new"><Button>+ New QRIS</Button></Link>}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Find order</CardTitle>
          <CardDescription>Paste an order ref to see live status</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.replace(`/payments?ref=${encodeURIComponent(orderRef)}`);
            }}
            className="flex gap-2"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="ref" className="sr-only">Order ref</Label>
              <Input
                id="ref"
                placeholder="ORDER-xxxx-1234"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
              />
            </div>
            <Button type="submit">Look up</Button>
          </form>
        </CardContent>
      </Card>

      {queryRef && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Order
              {status.data && <StatusBadge status={status.data.status} />}
            </CardTitle>
            <CardDescription className="font-mono text-xs">{queryRef}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {status.isLoading && "Loading…"}
            {status.isError && (
              <ErrorState
                error={status.error}
                title="Couldn't load this order"
                onRetry={() => status.refetch()}
              />
            )}
            {status.data && (
              <>
                <dl className="space-y-1">
                  <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Amount</dt><dd>{formatIDR(status.data.amount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Paid at</dt><dd>{formatDate(status.data.paid_at)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Expires</dt><dd>{formatDate(status.data.expires_at)}</dd></div>
                  {status.data.description && (
                    <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Description</dt><dd>{status.data.description}</dd></div>
                  )}
                </dl>
                {status.data.status === "PENDING" && (
                  <div className="flex flex-col items-center gap-2 pt-4">
                    <QRCodeSVG value={queryRef} size={180} />
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      (Showing order ref — replace with <code>qr_string</code> from QRIS create.)
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="text-sm">Loading…</div>}>
      <PaymentsView />
    </Suspense>
  );
}
