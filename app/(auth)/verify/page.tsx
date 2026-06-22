"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, MailCheck, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { ApiEnvelope } from "@/lib/api/types";
import { useBackendStatus } from "@/lib/api/backend-status-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VerifyState = "idle" | "verifying" | "success" | "error";

type ResendData = { verification_token?: string } | null | undefined;

function VerifyView() {
  const router = useRouter();
  const params = useSearchParams();
  const emailFromUrl = params.get("email") ?? "";
  const tokenFromUrl = params.get("token") ?? "";
  const autoResend = params.get("resend") === "1";

  const [email, setEmail] = useState(emailFromUrl);
  const [state, setState] = useState<VerifyState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Which path triggered the current verify: an explicit email-link click
  // ("link") vs the silent post-login auto-verify off the resend's dev token
  // ("resend"). Only "link" failures take over the screen with an error — a
  // failed post-login auto-verify isn't actionable (a fresh email was just sent).
  const verifyTrigger = useRef<"link" | "resend">("link");

  const verify = useMutation({
    mutationFn: async (tk: string) => {
      const res = await axios.get<ApiEnvelope<unknown>>(
        `/api/proxy/auth/verify?token=${encodeURIComponent(tk)}`,
        { timeout: 15000 }
      );
      // The backend can return HTTP 200 with success:false for an invalid/expired
      // token — axios won't throw on that, so validate the envelope explicitly.
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Verification failed");
      }
      return res.data;
    },
    onMutate: () => {
      setErrorMsg(null);
      // Only take over the screen with the spinner for a deliberate link click.
      // The post-login auto-verify runs quietly behind "Check your email".
      if (verifyTrigger.current === "link") setState("verifying");
    },
    onSuccess: () => {
      useBackendStatus.getState().setStatus("up");
      setState("success");
      toast.success("Email verified — you can sign in now");
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && (err.response?.status === 503 || !err.response)) {
        useBackendStatus.getState().setStatus("down");
        const msg = "Cannot reach the server. Please try again shortly.";
        // The global offline banner already covers this; only hijack the screen
        // for a deliberate link click.
        if (verifyTrigger.current === "link") {
          setState("error");
          setErrorMsg(msg);
        }
        toast.error(msg);
        return;
      }
      // A post-login auto-verify failing is not actionable — a fresh email was
      // just sent. Stay on "Check your email" instead of an alarming red error.
      if (verifyTrigger.current === "resend") return;
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Verification failed"
        : err instanceof Error
          ? err.message
          : "Verification failed";
      setState("error");
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const resend = useMutation({
    mutationFn: async (em: string) => {
      const res = await axios.post<ApiEnvelope<ResendData>>(
        "/api/proxy/auth/resend-verification",
        { email: em },
        { timeout: 15000 }
      );
      return res.data;
    },
    onSuccess: (res) => {
      useBackendStatus.getState().setStatus("up");
      // Privacy: backend returns 200 with a generic message even if email doesn't exist.
      toast.success(res.message ?? "Verification email sent");
      // Dev mode: token comes back inline — verify immediately (no manual paste UI).
      // Marked "resend" so a failure here stays quiet (see verify.onError).
      const devToken = res.data?.verification_token;
      if (devToken) {
        verifyTrigger.current = "resend";
        verify.mutate(devToken);
      }
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && (err.response?.status === 503 || !err.response)) {
        useBackendStatus.getState().setStatus("down");
        toast.error("Cannot reach the server. Please try again shortly.");
        return;
      }
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Couldn't resend verification email"
        : "Couldn't resend verification email";
      toast.error(msg);
    },
  });

  // Auto-verify when the page loads with a token in the URL (email-link click).
  // Ref-guarded so it fires once per token — StrictMode's double-mount (dev)
  // would otherwise send two verify requests, since `state` isn't in deps.
  const autoVerifiedToken = useRef<string | null>(null);
  useEffect(() => {
    if (tokenFromUrl && autoVerifiedToken.current !== tokenFromUrl) {
      autoVerifiedToken.current = tokenFromUrl;
      verifyTrigger.current = "link";
      verify.mutate(tokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  // Auto-send the verification email when redirected here from login (resend=1),
  // so the user doesn't have to click "Resend" manually. Skip if a token is
  // already present (that case auto-verifies instead). Guarded to fire once.
  const autoResendFired = useRef(false);
  useEffect(() => {
    if (autoResend && !tokenFromUrl && emailFromUrl && !autoResendFired.current) {
      autoResendFired.current = true;
      resend.mutate(emailFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResend, tokenFromUrl, emailFromUrl]);

  if (state === "verifying") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--color-muted-foreground)]" />
          <p className="text-sm">Verifying your email…</p>
        </CardContent>
      </Card>
    );
  }

  if (state === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <CardTitle>Email verified</CardTitle>
          <CardDescription>
            Your account{email ? ` (${email})` : ""} is ready to use.
          </CardDescription>
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
        {state === "error" ? (
          <XCircle className="h-10 w-10 text-red-600" />
        ) : (
          <MailCheck className="h-10 w-10 text-[color:var(--color-primary)]" />
        )}
        <CardTitle>
          {state === "error" ? "Verification failed" : "Check your email"}
        </CardTitle>
        <CardDescription>
          {state === "error" ? (
            errorMsg ?? "The verification link is invalid or expired."
          ) : (
            <>
              We sent a verification link
              {email ? (
                <> to <span className="font-medium">{email}</span></>
              ) : null}
              . Click it to activate your account.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resend verification email */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="resend-email">Didn&apos;t get the email?</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={!email.trim() || resend.isPending}
            onClick={() => resend.mutate(email.trim())}
          >
            {resend.isPending ? "Sending…" : "Resend verification email"}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm text-[color:var(--color-muted-foreground)]">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
          <span aria-hidden>·</span>
          <Link href="/forgot-password" className="underline">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
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
      <VerifyView />
    </Suspense>
  );
}
