"use client";

import React, { useState, useEffect } from "react";
import { resendVerificationEmailAction } from "@/actions/auth";

interface EmailVerificationBannerProps {
  email: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

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

  if (isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    setFeedback(null);
    setIsError(false);

    try {
      const result = await resendVerificationEmailAction({ email });
      if (result.success) {
        setFeedback("Verification link sent! Check your inbox.");
        setCooldown(result.cooldownSeconds ?? 60);
      } else {
        setIsError(true);
        setFeedback(result.error || "Could not resend email");
        if (result.cooldownSeconds) {
          setCooldown(result.cooldownSeconds);
        }
      }
    } catch {
      setIsError(true);
      setFeedback("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      aria-label="Email verification notice"
      className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] px-4 py-2.5 text-xs text-[#525252] flex flex-wrap items-center justify-between gap-2 transition-all relative z-30"
    >
      <div className="flex items-center gap-2 max-w-full">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E5E5E5] text-[#161616] text-[10px] font-bold">
          !
        </span>
        <span className="truncate">
          Please verify your email (<strong className="font-medium text-[#161616]">{email}</strong>) to enable live team invitations.
        </span>
        {feedback && (
          <span
            className={`font-medium ${
              isError ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            · {feedback}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleResend}
          disabled={loading || cooldown > 0}
          className="font-medium text-[#161616] hover:text-black underline underline-offset-2 disabled:opacity-50 disabled:no-underline transition-opacity"
        >
          {loading
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend email"}
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss banner"
          className="text-[#A3A3A3] hover:text-[#525252] p-0.5 rounded transition-colors"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
