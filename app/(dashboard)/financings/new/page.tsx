"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Landmark } from "lucide-react";

import { api } from "@/lib/api/client";
import {
  createMurabahahSchema,
  type CreateMurabahahInput,
  type FinancingResponse,
} from "@/lib/schemas/financing";
import type { ApiEnvelope } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";

export default function NewFinancingPage() {
  const router = useRouter();
  const form = useForm<CreateMurabahahInput>({
    resolver: zodResolver(createMurabahahSchema),
    defaultValues: {
      asset_name: "",
      cost_price: 0,
      margin_amount: 0,
      down_payment: 0,
      tenor: 12,
      first_due_date: "",
    },
  });

  // Live preview of the locked Syariah figures.
  const cost = Number(form.watch("cost_price")) || 0;
  const margin = Number(form.watch("margin_amount")) || 0;
  const dp = Number(form.watch("down_payment")) || 0;
  const tenor = Number(form.watch("tenor")) || 0;
  const totalPrice = cost + margin;
  const financed = Math.max(0, totalPrice - dp);
  const perMonth = tenor > 0 ? Math.round(financed / tenor) : 0;

  const mutation = useMutation({
    mutationFn: async (input: CreateMurabahahInput) => {
      // Drop empty optional date; send RFC3339 when provided.
      const payload: Record<string, unknown> = {
        asset_name: input.asset_name,
        cost_price: input.cost_price,
        margin_amount: input.margin_amount,
        down_payment: input.down_payment,
        tenor: input.tenor,
      };
      if (input.first_due_date) {
        payload.first_due_date = new Date(input.first_due_date).toISOString();
      }
      const res = await api.post<ApiEnvelope<FinancingResponse>>("/api/financings", payload);
      return res.data.data!;
    },
    onSuccess: (data) => {
      toast.success("Financing created — review and sign the akad");
      router.push(`/financings/${data.id}`);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? "Failed to create financing");
      } else {
        toast.error("Failed to create financing");
      }
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Landmark className="h-6 w-6" />
          New Murabahah financing
        </h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Cost-plus sale. The total obligation is locked at creation — no time-based interest.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Contract details</CardTitle>
          <CardDescription>The installment schedule is generated upfront.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset_name">Asset name</Label>
              <Input id="asset_name" placeholder="e.g. iPhone 17 Pro" {...form.register("asset_name")} />
              {form.formState.errors.asset_name && (
                <p className="text-xs text-red-600">{form.formState.errors.asset_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost price (IDR)</Label>
                <Input id="cost_price" type="number" min={1} {...form.register("cost_price")} />
                {form.formState.errors.cost_price && (
                  <p className="text-xs text-red-600">{form.formState.errors.cost_price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin_amount">Margin (IDR)</Label>
                <Input id="margin_amount" type="number" min={0} {...form.register("margin_amount")} />
                {form.formState.errors.margin_amount && (
                  <p className="text-xs text-red-600">{form.formState.errors.margin_amount.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="down_payment">Down payment (IDR)</Label>
                <Input id="down_payment" type="number" min={0} {...form.register("down_payment")} />
                {form.formState.errors.down_payment && (
                  <p className="text-xs text-red-600">{form.formState.errors.down_payment.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenor">Tenor (months)</Label>
                <Input id="tenor" type="number" min={1} max={360} {...form.register("tenor")} />
                {form.formState.errors.tenor && (
                  <p className="text-xs text-red-600">{form.formState.errors.tenor.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_due_date">First due date (optional)</Label>
              <Input id="first_due_date" type="date" {...form.register("first_due_date")} />
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                Leave blank to default to roughly one month from now.
              </p>
            </div>

            <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">Total price (cost + margin)</span>
                <span className="font-medium">{formatIDR(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">Financed (after down payment)</span>
                <span className="font-medium">{formatIDR(financed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">≈ per month</span>
                <span className="font-medium">{tenor > 0 ? formatIDR(perMonth) : "—"}</span>
              </div>
            </div>

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Creating…" : "Create financing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
