"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import {
  approveFinancingSchema,
  type ApproveFinancingInput,
  type FinancingResponse,
} from "@/lib/schemas/financing";
import type { QrisResponse } from "@/lib/schemas/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancingStatusBadge, InstallmentStatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { useCan, Resource, Action } from "@/lib/api/rbac";
import { useAuthStore } from "@/lib/api/auth-store";
import { formatDate, formatIDR } from "@/lib/utils";

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? fallback;
  return fallback;
}

export default function FinancingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  // Signing the akad and paying installments are contract actions staff can't
  // perform (financings sign/pay) — staff has read-only oversight.
  const canSign = useCan(Resource.Financings, Action.Sign);
  const canPay = useCan(Resource.Financings, Action.Pay);
  // Approving (setting margin + terms) is a back-office action — staff/admin only.
  const canApprove = useCan(Resource.Financings, Action.Approve);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [confirmSign, setConfirmSign] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const approveForm = useForm<ApproveFinancingInput>({
    resolver: zodResolver(approveFinancingSchema),
    defaultValues: { cost_price: 0, margin_amount: 0, down_payment: 0, tenor: 12, first_due_date: "" },
  });

  const query = useQuery({
    queryKey: ["financing", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<FinancingResponse>>(`/api/financings/${id}`);
      return res.data.data!;
    },
  });

  const sign = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<FinancingResponse>>(`/api/financings/${id}/sign`, {});
      return res.data.data!;
    },
    onSuccess: () => {
      toast.success("Akad signed — financing is now active");
      setConfirmSign(false);
      qc.invalidateQueries({ queryKey: ["financing", id] });
      qc.invalidateQueries({ queryKey: ["financings"] });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to sign akad")),
  });

  const pay = useMutation({
    mutationFn: async (no: number) => {
      const res = await api.post<ApiEnvelope<QrisResponse>>(
        `/api/financings/${id}/installments/${no}/pay`,
        {}
      );
      return res.data.data!;
    },
    onSuccess: (data) => {
      toast.success("QRIS created for installment");
      router.push(`/payments?ref=${encodeURIComponent(data.order_ref)}`);
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to create payment")),
  });

  const approve = useMutation({
    mutationFn: async (input: ApproveFinancingInput) => {
      const payload: Record<string, unknown> = {
        cost_price: input.cost_price,
        margin_amount: input.margin_amount,
        down_payment: input.down_payment,
        tenor: input.tenor,
      };
      if (input.first_due_date) payload.first_due_date = new Date(input.first_due_date).toISOString();
      const res = await api.post<ApiEnvelope<FinancingResponse>>(`/api/financings/${id}/approve`, payload);
      return res.data.data!;
    },
    onSuccess: () => {
      toast.success("Financing approved — the owner can now sign the akad");
      setApproveOpen(false);
      qc.invalidateQueries({ queryKey: ["financing", id] });
      qc.invalidateQueries({ queryKey: ["financings"] });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to approve financing")),
  });

  const f = query.data;

  // Prefill the approval form from the application, then open the modal.
  function openApprove() {
    if (!f) return;
    approveForm.reset({
      cost_price: f.cost_price,
      margin_amount: f.margin_amount,
      down_payment: f.down_payment,
      tenor: f.tenor,
      first_due_date: f.first_due_date ? f.first_due_date.slice(0, 10) : "",
    });
    setApproveOpen(true);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/financings"
          className="inline-flex items-center gap-1 text-sm text-[color:var(--color-muted-foreground)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to financings
        </Link>
      </div>

      {query.isLoading && <p className="text-sm">Loading…</p>}
      {query.isError && (
        <ErrorState
          error={query.error}
          title="Couldn't load this financing"
          backHref="/financings"
          onRetry={() => query.refetch()}
        />
      )}

      {f && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {f.asset_name}
                <FinancingStatusBadge status={f.status} />
              </CardTitle>
              <div className="mt-1 space-y-0.5 text-sm text-[color:var(--color-muted-foreground)]">
                <p>
                  {f.akad_type} · #{f.id}
                  {f.user_name ? ` · ${f.user_name}` : ""}
                </p>
                {f.approver_name && (
                  <p>
                    Approved by {f.approver_name}
                    {f.approved_at ? ` on ${formatDate(f.approved_at)}` : ""}
                  </p>
                )}
                <p>
                  {f.akad_signed_at
                    ? `Akad signed ${formatDate(f.akad_signed_at)}`
                    : "Akad not yet signed"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-1">
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Cost price</dt><dd>{formatIDR(f.cost_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Margin</dt><dd>{formatIDR(f.margin_amount)}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Total price</dt><dd className="font-medium">{formatIDR(f.total_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Down payment</dt><dd>{formatIDR(f.down_payment)}</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Tenor</dt><dd>{f.tenor} months</dd></div>
                <div className="flex justify-between"><dt className="text-[color:var(--color-muted-foreground)]">Currency</dt><dd>{f.currency}</dd></div>
              </dl>

              {f.status === "APPLIED" && canApprove && (
                <div className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] p-3">
                  <p className="text-[color:var(--color-muted-foreground)]">
                    Review the application, set the margin, and approve to generate the schedule.
                  </p>
                  <Button onClick={openApprove}>Set terms &amp; approve</Button>
                </div>
              )}

              {f.status === "APPLIED" && !canApprove && (
                <p className="rounded-md border border-[color:var(--color-border)] p-3 text-[color:var(--color-muted-foreground)]">
                  Your application is awaiting review. An officer will set the margin and terms before
                  you can sign the akad.
                </p>
              )}

              {f.status === "APPROVED" && canSign && f.user_id === currentUserId && (
                <div className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] p-3">
                  <p className="text-[color:var(--color-muted-foreground)]">
                    Sign the akad to activate the contract and enable installment payments.
                  </p>
                  <Button onClick={() => setConfirmSign(true)} disabled={sign.isPending}>
                    {sign.isPending ? "Signing…" : "Sign akad"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installment schedule</CardTitle>
              <CardDescription>
                {f.status === "ACTIVE"
                  ? "Pay an unpaid installment to generate a QRIS."
                  : f.status === "APPROVED"
                  ? "Sign the akad first to enable payments."
                  : f.status === "APPLIED"
                  ? "Awaiting approval — the schedule is generated once an officer sets the terms."
                  : "Schedule (read-only)."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)]">
                      <th className="text-left py-2 px-2 font-medium">#</th>
                      <th className="text-left py-2 px-2 font-medium">Due</th>
                      <th className="text-right py-2 px-2 font-medium">Principal</th>
                      <th className="text-right py-2 px-2 font-medium">Margin</th>
                      <th className="text-right py-2 px-2 font-medium">Amount</th>
                      <th className="text-left py-2 px-2 font-medium">Status</th>
                      <th className="text-right py-2 px-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.installments?.map((inst) => (
                      <tr key={inst.installment_no} className="border-b border-[color:var(--color-border)] last:border-0">
                        <td className="py-2 px-2">{inst.installment_no}</td>
                        <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">{formatDate(inst.due_date)}</td>
                        <td className="py-2 px-2 text-right">{formatIDR(inst.principal_part)}</td>
                        <td className="py-2 px-2 text-right">{formatIDR(inst.margin_part)}</td>
                        <td className="py-2 px-2 text-right font-medium">{formatIDR(inst.amount)}</td>
                        <td className="py-2 px-2"><InstallmentStatusBadge status={inst.status} /></td>
                        <td className="py-2 px-2 text-right">
                          {f.status === "ACTIVE" && inst.status !== "PAID" && canPay ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pay.isPending && pay.variables === inst.installment_no}
                              onClick={() => pay.mutate(inst.installment_no)}
                            >
                              {pay.isPending && pay.variables === inst.installment_no ? "…" : "Pay"}
                            </Button>
                          ) : inst.status === "PAID" ? (
                            <span className="text-xs text-[color:var(--color-muted-foreground)]">
                              {inst.paid_at ? formatDate(inst.paid_at) : "Paid"}
                            </span>
                          ) : (
                            <span className="text-xs text-[color:var(--color-muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!f.installments || f.installments.length === 0) && (
                      <tr><td colSpan={7} className="py-6 text-center text-[color:var(--color-muted-foreground)]">No schedule</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Modal
            open={approveOpen}
            onClose={() => !approve.isPending && setApproveOpen(false)}
            title="Set terms & approve"
            description={`Confirm the figures and set the margin for ${f.asset_name}. This locks the terms, generates the installment schedule, and lets the owner sign the akad.`}
          >
            <form onSubmit={approveForm.handleSubmit((v) => approve.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ap_cost">Cost price (IDR)</Label>
                  <Controller
                    control={approveForm.control}
                    name="cost_price"
                    render={({ field }) => (
                      <NumberInput id="ap_cost" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    )}
                  />
                  {approveForm.formState.errors.cost_price && (
                    <p className="text-xs text-red-600">{approveForm.formState.errors.cost_price.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ap_margin">Margin (IDR)</Label>
                  <Controller
                    control={approveForm.control}
                    name="margin_amount"
                    render={({ field }) => (
                      <NumberInput id="ap_margin" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    )}
                  />
                  {approveForm.formState.errors.margin_amount && (
                    <p className="text-xs text-red-600">{approveForm.formState.errors.margin_amount.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ap_dp">Down payment (IDR)</Label>
                  <Controller
                    control={approveForm.control}
                    name="down_payment"
                    render={({ field }) => (
                      <NumberInput id="ap_dp" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    )}
                  />
                  {approveForm.formState.errors.down_payment && (
                    <p className="text-xs text-red-600">{approveForm.formState.errors.down_payment.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ap_tenor">Tenor (months)</Label>
                  <Input id="ap_tenor" type="number" min={1} max={360} {...approveForm.register("tenor")} />
                  {approveForm.formState.errors.tenor && (
                    <p className="text-xs text-red-600">{approveForm.formState.errors.tenor.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap_due">First due date (optional)</Label>
                <Input id="ap_due" type="date" {...approveForm.register("first_due_date")} />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApproveOpen(false)}
                  disabled={approve.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={approve.isPending}>
                  {approve.isPending ? "Approving…" : "Approve"}
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            open={confirmSign}
            onClose={() => !sign.isPending && setConfirmSign(false)}
            title="Sign akad"
            description={`Signing activates the contract for ${f.asset_name} (${formatIDR(f.total_price)}) and enables installment payments. This can't be undone.`}
          >
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmSign(false)}
                disabled={sign.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => sign.mutate()} disabled={sign.isPending}>
                {sign.isPending ? "Signing…" : "Sign akad"}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
