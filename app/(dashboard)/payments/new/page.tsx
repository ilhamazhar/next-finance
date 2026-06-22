"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { api } from "@/lib/api/client";
import { createQrisSchema, type CreateQrisInput, type QrisResponse } from "@/lib/schemas/payment";
import type { ApiEnvelope } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPaymentPage() {
  const router = useRouter();
  const form = useForm<CreateQrisInput>({
    resolver: zodResolver(createQrisSchema),
    defaultValues: { amount: 5000, description: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreateQrisInput) => {
      const res = await api.post<ApiEnvelope<QrisResponse>>("/api/payments/qris", input);
      return res.data.data!;
    },
    onSuccess: (data) => {
      toast.success("QRIS created");
      router.push(`/payments?ref=${encodeURIComponent(data.order_ref)}`);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? "Failed to create QRIS");
      } else {
        toast.error("Failed to create QRIS");
      }
    },
  });

  return (
    <div className="max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            New QRIS payment
          </CardTitle>
          <CardDescription>
            Sends a request to Xendit via the backend. Needs a working test key on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (IDR)</Label>
              <Input id="amount" type="number" min={1} {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>
              )}
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Creating…" : "Create QRIS"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
