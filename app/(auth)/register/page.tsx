"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { registerSchema, type RegisterInput, type RegisterResponse } from "@/lib/schemas/auth";
import type { ApiEnvelope } from "@/lib/api/types";
import { useBackendStatus } from "@/lib/api/backend-status-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", password_confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await axios.post<ApiEnvelope<RegisterResponse>>(
        "/api/proxy/auth/register",
        input
      );
      return res.data.data!;
    },
    onSuccess: (data) => {
      useBackendStatus.getState().setStatus("up");
      toast.success("Account created — check your email to verify");
      const params = new URLSearchParams({ email: data.user.email });
      // Dev mode: backend returns the token inline so local testing has a real link.
      if (data.verification_token) params.set("token", data.verification_token);
      router.push(`/verify?${params.toString()}`);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 503 || !err.response) {
          useBackendStatus.getState().setStatus("down");
          toast.error("Cannot reach the server. Please try again shortly.");
          return;
        }
        toast.error(err.response?.data?.message ?? "Registration failed");
      } else {
        toast.error("Registration failed");
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>We&apos;ll email a verification link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirm">Confirm password</Label>
            <Input id="password_confirm" type="password" {...form.register("password_confirm")} />
            {form.formState.errors.password_confirm && (
              <p className="text-xs text-red-600">{form.formState.errors.password_confirm.message}</p>
            )}
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Creating…" : "Create account"}
          </Button>
          <p className="text-sm text-center text-[color:var(--color-muted-foreground)]">
            Already have one?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
