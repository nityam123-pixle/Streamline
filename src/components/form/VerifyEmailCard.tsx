"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmailAction, resendVerificationEmailAction } from "@/actions/auth";
import { FormHeader } from "./FormHeader";
import { SubmitButton } from "./SubmitButton";

interface VerifyEmailCardProps {
  initialToken?: string;
}

type VerificationStatus =
  | "checking"
  | "success"
  | "consumed"
  | "expired"
  | "invalid"
  | "prompt_resend";

export function VerifyEmailCard({ initialToken }: VerifyEmailCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<VerificationStatus>("checking");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  useEffect(() => {
    const rawToken = initialToken || searchParams.get("token") || "";

    if (!rawToken) {
      setStatus("prompt_resend");
      return;
    }

    // Strip raw token from browser address bar immediately to prevent token leakage in HTTP referrers
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function executeVerification() {
      try {
        const result = await verifyEmailAction(rawToken);

        if (result.email) {
          setVerifiedEmail(result.email);
        }

        if (result.status === "success") {
          setStatus("success");
        } else if (result.status === "consumed") {
          setStatus("consumed");
        } else if (result.status === "expired") {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      } catch (err: unknown) {
        console.error("Verification error:", err);
        setStatus("invalid");
      }
    }

    executeVerification();
  }, [initialToken, searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || resending) return;

    setResendError(null);
    setResendMessage(null);
    setResending(true);

    try {
      const result = await resendVerificationEmailAction({
        email: resendEmail.trim() || undefined,
      });

      if (result.success) {
        setResendMessage(result.message);
        setCooldown(result.cooldownSeconds ?? 60);
      } else {
        setResendError(result.error || "Failed to resend verification email");
        if (result.cooldownSeconds) {
          setCooldown(result.cooldownSeconds);
        }
      }
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex flex-col justify-between p-8 lg:p-16 overflow-y-auto">
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        {/* CHECKING STATE */}
        {status === "checking" && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-10 h-10 border-2 border-[#161616] border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[#161616] tracking-tight">
                Verifying your email
              </h2>
              <p className="text-sm text-[#737373]">
                Checking cryptographic token validity and activating permissions...
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "success" && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-emerald-600 text-2xl font-bold">
              ✓
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#161616]">
                Email verified successfully
              </h1>
              <p className="text-sm text-[#525252] leading-relaxed">
                Your email address{" "}
                {verifiedEmail && (
                  <span className="font-medium text-[#161616]">({verifiedEmail})</span>
                )}{" "}
                has been confirmed. You now have full access to send live teammate invitations and complete workspace onboarding.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/welcome"
                className="w-full inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#161616] text-white text-sm font-medium hover:bg-[#262626] transition-colors"
              >
                Continue to Streamline
              </Link>
            </div>
          </div>
        )}

        {/* ALREADY CONSUMED STATE */}
        {status === "consumed" && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-blue-600 text-xl font-bold">
              ℹ
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#161616]">
                Email already verified
              </h1>
              <p className="text-sm text-[#525252] leading-relaxed">
                This verification link was already used. Your account email address is fully confirmed and ready.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/welcome"
                className="w-full inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#161616] text-white text-sm font-medium hover:bg-[#262626] transition-colors"
              >
                Continue to Streamline
              </Link>
            </div>
          </div>
        )}

        {/* EXPIRED STATE */}
        {status === "expired" && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-amber-600 text-xl font-bold">
              ⏳
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#161616]">
                Verification link expired
              </h1>
              <p className="text-sm text-[#525252] leading-relaxed">
                Verification links expire after 24 hours for account security. Request a new link below to complete verification.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="resend-email" className="block text-xs font-medium text-[#525252]">
                  Work email
                </label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#161616] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-[#161616] focus:border-[#161616]"
                />
              </div>

              {resendError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {resendError}
                </div>
              )}

              {resendMessage && (
                <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || cooldown > 0}
                className="w-full h-10 px-4 rounded-lg bg-[#161616] text-white text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors"
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : "Send new verification link"}
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs text-[#737373] hover:text-[#161616] underline underline-offset-4">
                Back to Sign in
              </Link>
            </div>
          </div>
        )}

        {/* INVALID STATE */}
        {status === "invalid" && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-rose-600 text-xl font-bold">
              ✕
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#161616]">
                Invalid verification link
              </h1>
              <p className="text-sm text-[#525252] leading-relaxed">
                This verification link is invalid, incomplete, or corrupted. Request a fresh link below to verify your email.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="resend-email-invalid" className="block text-xs font-medium text-[#525252]">
                  Work email
                </label>
                <input
                  id="resend-email-invalid"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#161616] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-[#161616] focus:border-[#161616]"
                />
              </div>

              {resendError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {resendError}
                </div>
              )}

              {resendMessage && (
                <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || cooldown > 0}
                className="w-full h-10 px-4 rounded-lg bg-[#161616] text-white text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors"
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : "Send new verification link"}
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs text-[#737373] hover:text-[#161616] underline underline-offset-4">
                Back to Sign in
              </Link>
            </div>
          </div>
        )}

        {/* PROMPT RESEND STATE (Loaded /verify-email without token) */}
        {status === "prompt_resend" && (
          <div className="space-y-6">
            <FormHeader
              title="Verify your email"
              subtitle="Enter your work email address to request a secure verification link."
            />

            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="prompt-email" className="block text-xs font-medium text-[#525252]">
                  Work email
                </label>
                <input
                  id="prompt-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#161616] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-[#161616] focus:border-[#161616]"
                />
              </div>

              {resendError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {resendError}
                </div>
              )}

              {resendMessage && (
                <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || cooldown > 0}
                className="w-full h-10 px-4 rounded-lg bg-[#161616] text-white text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors"
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : "Send verification link"}
              </button>
            </form>

            <div className="pt-4 text-center">
              <Link href="/login" className="text-xs text-[#737373] hover:text-[#161616] underline underline-offset-4">
                Back to Sign in
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="w-full text-center text-xs text-[#A3A3A3] py-4">
        Protected by Streamline Security · Anti abuse and domain reputation controls active
      </div>
    </div>
  );
}
