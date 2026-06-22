"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
} from "@/lib/schemas/auth";
import type { ApiEnvelope } from "@/lib/api/types";
import { useBackendStatus } from "@/lib/api/backend-status-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      const res = await axios.post<ApiEnvelope<ForgotPasswordResponse>>(
        "/api/proxy/auth/forgot-password",
        input,
        { timeout: 15000 }
      );
      return res.data;
    },
    onSuccess: (res, input) => {
      useBackendStatus.getState().setStatus("up");
      // Privacy: backend returns 200 with a generic message even if the email
      // doesn't exist — never reveal whether an account was found.
      setSentTo(input.email);
      // Dev mode: token comes back inline so local testing has a real link.
      setDevToken(res.data?.reset_token ?? null);
      toast.success(res.message ?? "If that email exists, a reset link is on its way");
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 503 || !err.response) {
          useBackendStatus.getState().setStatus("down");
          toast.error("Cannot reach the server. Please try again shortly.");
          return;
        }
        toast.error(err.response?.data?.message ?? "Couldn't send reset email");
      } else {
        toast.error("Couldn't send reset email");
      }
    },
  });

  if (sentTo) {
    const query = new URLSearchParams({ email: sentTo });
    if (devToken) query.set("token", devToken);

    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <MailCheck className="h-10 w-10 text-[color:var(--color-primary)]" />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for <span className="font-medium">{sentTo}</span>, we&apos;ve sent
            a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => router.push(`/reset-password?${query.toString()}`)}
          >
            Enter reset token
          </Button>
          <p className="text-sm text-center text-[color:var(--color-muted-foreground)]">
            <Link href="/login" className="underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm text-center text-[color:var(--color-muted-foreground)]">
            Remembered it?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
