"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { useAuthStore } from "@/lib/api/auth-store";
import { useBackendStatus } from "@/lib/api/backend-status-store";
import type { ApiEnvelope, TokenPair } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await axios.post<ApiEnvelope<Omit<TokenPair, "refresh_token">>>(
        "/api/auth/login",
        input,
        { withCredentials: true }
      );
      return res.data;
    },
    onSuccess: (res) => {
      useBackendStatus.getState().setStatus("up");
      if (!res.data) {
        toast.error(res.message ?? "Login failed");
        return;
      }
      setSession({ accessToken: res.data.access_token, user: res.data.user });
      toast.success("Welcome back");
      router.push("/dashboard");
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        // 503 = backend unreachable; no response = network failure.
        if (err.response?.status === 503 || !err.response) {
          useBackendStatus.getState().setStatus("down");
          toast.error("Cannot reach the server. Please try again shortly.");
          return;
        }
        // 403 = backend signals "email not verified" — bounce to the verify flow
        if (err.response?.status === 403) {
          const email = form.getValues("email");
          toast.message("Please verify your email first");
          router.push(`/verify?email=${encodeURIComponent(email)}&resend=1`);
          return;
        }
        toast.error(err.response?.data?.message ?? "Login failed");
      } else {
        toast.error("Login failed");
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your Azhar Finance credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
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
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-center">
            <Link href="/forgot-password" className="underline text-[color:var(--color-muted-foreground)]">
              Forgot password?
            </Link>
          </p>
          <p className="text-sm text-center text-[color:var(--color-muted-foreground)]">
            No account?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
