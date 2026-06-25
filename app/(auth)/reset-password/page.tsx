"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import type { ApiEnvelope } from "@/lib/api/types";
import { useBackendStatus } from "@/lib/api/backend-status-store";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordView() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromUrl, new_password: "", confirm_password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const res = await axios.post<ApiEnvelope<unknown>>(
        "/api/proxy/auth/reset-password",
        input,
        { timeout: 15000 }
      );
      // Backend may return HTTP 200 with success:false for an invalid/expired
      // token — axios won't throw on that, so validate the envelope explicitly.
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Password reset failed");
      }
      return res.data;
    },
    onSuccess: () => {
      useBackendStatus.getState().setStatus("up");
      toast.success("Password reset — you can sign in now");
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && (err.response?.status === 503 || !err.response)) {
        useBackendStatus.getState().setStatus("down");
        toast.error("Cannot reach the server. Please try again shortly.");
        return;
      }
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Password reset failed"
        : err instanceof Error
          ? err.message
          : "Password reset failed";
      toast.error(msg);
    },
  });

  if (mutation.isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <CardTitle>Password reset</CardTitle>
          <CardDescription>Your password has been updated.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Continue to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <KeyRound className="h-10 w-10 text-[color:var(--color-primary)]" />
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          {/* Token comes from the email link; submitted as a hidden field. */}
          <input type="hidden" {...form.register("token")} />
          {form.formState.errors.token && (
            <p className="text-xs text-red-600">{form.formState.errors.token.message}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <PasswordInput
              id="new_password"
              autoComplete="new-password"
              {...form.register("new_password")}
            />
            {form.formState.errors.new_password && (
              <p className="text-xs text-red-600">{form.formState.errors.new_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <PasswordInput
              id="confirm_password"
              autoComplete="new-password"
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password && (
              <p className="text-xs text-red-600">
                {form.formState.errors.confirm_password.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-sm text-center text-[color:var(--color-muted-foreground)]">
            <Link href="/login" className="underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordView />
    </Suspense>
  );
}
