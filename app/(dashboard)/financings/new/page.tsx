"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirePermission } from "@/components/require-permission";
import { Resource, Action } from "@/lib/api/rbac";
import { formatIDR } from "@/lib/utils";

export default function NewFinancingPage() {
  // Creating a financing requires financings/create (admin + user, not staff).
  return (
    <RequirePermission resource={Resource.Financings} action={Action.Create} redirectTo="/financings">
      <NewFinancingForm />
    </RequirePermission>
  );
}

function NewFinancingForm() {
  const router = useRouter();
  const form = useForm<CreateMurabahahInput>({
    resolver: zodResolver(createMurabahahSchema),
    defaultValues: {
      asset_name: "",
      cost_price: 0,
      down_payment: 0,
      tenor: 12,
      first_due_date: "",
    },
  });

  // Live preview of the applied-for figures. Margin and the monthly installment
  // are only known once an officer approves and sets the terms.
  const cost = Number(form.watch("cost_price")) || 0;
  const dp = Number(form.watch("down_payment")) || 0;

  const mutation = useMutation({
    mutationFn: async (input: CreateMurabahahInput) => {
      // Drop empty optional date; send RFC3339 when provided.
      const payload: Record<string, unknown> = {
        asset_name: input.asset_name,
        cost_price: input.cost_price,
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
      toast.success("Application submitted — an officer will review and set the terms");
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
          Apply for Murabahah financing
        </h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Cost-plus sale. Submit the asset and amount you need — an officer sets the margin and
          generates the installment schedule when they approve your application.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Application details</CardTitle>
          <CardDescription>The margin and schedule are set at approval, not now.</CardDescription>
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
                <Controller
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <NumberInput id="cost_price" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                {form.formState.errors.cost_price && (
                  <p className="text-xs text-red-600">{form.formState.errors.cost_price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="down_payment">Down payment (IDR)</Label>
                <Controller
                  control={form.control}
                  name="down_payment"
                  render={({ field }) => (
                    <NumberInput id="down_payment" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                {form.formState.errors.down_payment && (
                  <p className="text-xs text-red-600">{form.formState.errors.down_payment.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenor">Tenor (months)</Label>
                <Input id="tenor" type="number" min={1} max={360} {...form.register("tenor")} />
                {form.formState.errors.tenor && (
                  <p className="text-xs text-red-600">{form.formState.errors.tenor.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_due_date">First due date (optional)</Label>
                <Input id="first_due_date" type="date" {...form.register("first_due_date")} />
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  Blank → ~one month out.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">Cost price</span>
                <span className="font-medium">{formatIDR(cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">Down payment</span>
                <span className="font-medium">{formatIDR(dp)}</span>
              </div>
              <p className="pt-1 text-xs text-[color:var(--color-muted-foreground)]">
                Margin and the monthly installment are set when an officer approves your application.
              </p>
            </div>

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
