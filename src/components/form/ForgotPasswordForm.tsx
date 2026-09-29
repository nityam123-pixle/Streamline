"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";
import { FormHeader } from "./FormHeader";
import { InputField } from "./InputField";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await requestPasswordResetAction({ email });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
        {submitted ? (
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 text-emerald-700 font-semibold text-lg">
              ✓
            </div>

            <h2 className="text-[24px] font-semibold text-[#282828] tracking-[-0.015em] leading-[32px] mb-2">
              Check your email
            </h2>

            <p className="text-[14px] font-normal text-[#757575] leading-[22px] mb-6">
              If an account exists with <span className="font-semibold text-[#282828]">{email}</span>, we have sent instructions to reset your password. The link will expire in 1 hour.
            </p>

            <div className="p-3.5 mb-6 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] leading-relaxed w-full">
              Be sure to check your spam or promotions folder if you do not see the email in your inbox within a few minutes.
            </div>

            <div className="space-y-3 w-full">
              <Link
                href="/login"
                className="w-full h-10 inline-flex items-center justify-center rounded-[8px] bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Return to sign in
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="w-full text-center text-xs text-[#64748B] hover:text-foreground py-2 cursor-pointer transition-colors"
              >
                Try a different email address
              </button>
            </div>
          </div>
        ) : (
          <>
            <FormHeader
              title="Reset your password"
              subtitle="Enter your work email and we will send you a recovery link"
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

              <InputField
                id="reset-email"
                label="Work email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <SubmitButton
                loading={loading}
                label="Send recovery link"
                loadingLabel="Sending link..."
              />
            </form>

            <div className="mt-6 text-center text-xs text-[#64748B]">
              <span>Remember your password?</span>
              <Link href="/login" className="font-semibold text-foreground hover:underline ml-1">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
