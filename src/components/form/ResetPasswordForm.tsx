"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { validateResetTokenAction, resetPasswordAction } from "@/actions/auth";
import { FormHeader } from "./FormHeader";
import { PasswordField } from "./PasswordField";
import { SubmitButton } from "./SubmitButton";

interface ResetPasswordFormProps {
  initialToken?: string;
}

export function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string>(() => initialToken || searchParams.get("token") || "");
  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid" | "expired" | "consumed">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const rawToken = token || searchParams.get("token") || "";

    if (!rawToken) {
      setTokenStatus("invalid");
      return;
    }

    setToken(rawToken);

    // Strip raw token from browser address bar immediately to prevent shoulder surfing or referrer leakage
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function checkToken() {
      try {
        const result = await validateResetTokenAction(rawToken);
        if (!result.valid) {
          if (result.reason === "expired") {
            setTokenStatus("expired");
          } else if (result.reason === "consumed") {
            setTokenStatus("consumed");
          } else {
            setTokenStatus("invalid");
          }
          return;
        }
        setTokenStatus("valid");
      } catch (err: unknown) {
        setTokenStatus("invalid");
      }
    }

    checkToken();
  }, [token, searchParams]);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setErrorMessage("Please ensure your password satisfies all security requirements");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordAction({
        token,
        password,
        confirmPassword,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to reset password. Please try again.");
        setLoading(false);
        return;
      }

      // Success: redirect to login page with reset query indicator
      router.push("/login?reset=success");
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage("An unexpected error occurred while resetting your password");
      setLoading(false);
    }
  };

  if (tokenStatus === "checking") {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col items-center justify-center py-12 text-sm text-[#757575]">
          Verifying security link...
        </div>
      </div>
    );
  }

  if (tokenStatus === "expired") {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col items-start py-8">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center mb-5 text-amber-700 font-semibold text-lg">
            !
          </div>

          <h2 className="text-[24px] font-semibold text-[#282828] tracking-[-0.015em] leading-[32px] mb-2">
            Reset link expired
          </h2>

          <p className="text-[14px] font-normal text-[#757575] leading-[22px] mb-6">
            This password recovery link has expired. Password reset links are valid for 1 hour for your security.
          </p>

          <Link
            href="/forgot-password"
            className="w-full h-10 inline-flex items-center justify-center rounded-[8px] bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (tokenStatus === "consumed") {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col items-start py-8">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mb-5 text-blue-700 font-semibold text-lg">
            ℹ
          </div>

          <h2 className="text-[24px] font-semibold text-[#282828] tracking-[-0.015em] leading-[32px] mb-2">
            Link already used
          </h2>

          <p className="text-[14px] font-normal text-[#757575] leading-[22px] mb-6">
            This recovery link has already been used to update your password. If you need to change your password again, please request a fresh link.
          </p>

          <div className="space-y-3 w-full">
            <Link
              href="/login"
              className="w-full h-10 inline-flex items-center justify-center rounded-[8px] bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign in with your password
            </Link>

            <Link
              href="/forgot-password"
              className="w-full h-10 inline-flex items-center justify-center rounded-[8px] border border-[#E2E8F0] bg-background text-[#282828] text-sm font-medium hover:bg-muted transition-colors"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col items-start py-8">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center mb-5 text-red-600 font-semibold text-lg">
            ✕
          </div>

          <h2 className="text-[24px] font-semibold text-[#282828] tracking-[-0.015em] leading-[32px] mb-2">
            Invalid reset link
          </h2>

          <p className="text-[14px] font-normal text-[#757575] leading-[22px] mb-6">
            This password recovery link is invalid or incomplete. Please ensure you clicked the full link sent to your email or request a new one.
          </p>

          <Link
            href="/forgot-password"
            className="w-full h-10 inline-flex items-center justify-center rounded-[8px] bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
        <FormHeader
          title="Create new password"
          subtitle="Choose a secure password for your Streamline workspace"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium"
            >
              {errorMessage}
            </div>
          )}

          <PasswordField
            id="reset-password-input"
            label="New password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordField
            id="reset-password-confirm"
            label="Confirm new password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {/* Password complexity helper */}
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs">
            <div className="font-semibold text-[#282828] mb-1">Password requirements:</div>
            <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-700" : "text-[#64748B]"}`}>
              <span>{hasMinLength ? "✓" : "○"}</span>
              <span>Minimum 8 characters</span>
            </div>
            <div className={`flex items-center gap-2 ${hasLetter ? "text-emerald-700" : "text-[#64748B]"}`}>
              <span>{hasLetter ? "✓" : "○"}</span>
              <span>At least one letter</span>
            </div>
            <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-700" : "text-[#64748B]"}`}>
              <span>{hasNumber ? "✓" : "○"}</span>
              <span>At least one number</span>
            </div>
            {confirmPassword.length > 0 && (
              <div className={`flex items-center gap-2 ${passwordsMatch ? "text-emerald-700" : "text-red-600"}`}>
                <span>{passwordsMatch ? "✓" : "○"}</span>
                <span>Passwords match</span>
              </div>
            )}
          </div>

          <SubmitButton
            loading={loading}
            label="Update password"
            loadingLabel="Updating password..."
          />
        </form>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          <span>Remember your old password?</span>
          <Link href="/login" className="font-semibold text-foreground hover:underline ml-1">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
