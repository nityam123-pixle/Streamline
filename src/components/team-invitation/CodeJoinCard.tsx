'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  joinOrganizationByCodeAction,
  type GetOrganizationByCodeResult,
} from "@/actions/team-invitation";

interface CodeJoinCardProps {
  code: string;
  initialData: GetOrganizationByCodeResult;
}

export function CodeJoinCard({ code, initialData }: CodeJoinCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  // State A: Invalid or nonexistent invite code (AC-7)
  if (!initialData.success || !initialData.organization) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
          <div
            className="w-[44px] h-[44px] rounded-full bg-[#FFF5F5] border border-[#FED7D7] flex items-center justify-center flex-shrink-0 mb-4"
            aria-hidden="true"
          >
            <svg
              className="w-[20px] h-[20px] text-[#C53030]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0 mb-2">
            Workspace Link Not Found
          </h1>
          <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 mb-6">
            {initialData.error ||
              "We couldn't find a workspace associated with this invite link. The code may be incorrect or the link may have been revoked."}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center text-white font-['Geist',sans-serif] text-[14px] font-medium transition-all"
              style={{
                boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
                boxSizing: "border-box",
              }}
            >
              Sign in to Streamline
            </Link>
            <Link
              href="/"
              className="w-full h-[36px] bg-white hover:bg-[#FAFAFA] border border-[#E4E4E4] rounded-[8px] px-[10px] flex items-center justify-center text-[#282828] font-['Geist',sans-serif] text-[14px] font-medium transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { organization, currentUser } = initialData;

  // State B: Authenticated User (AC-6: 1-Click Join as Viewer)
  if (currentUser) {
    const handleOneClickJoin = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await joinOrganizationByCodeAction({ inviteCode: code });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to join workspace.");
          setLoading(false);
          return;
        }

        router.push(res.redirectUrl || "/launch");
        router.refresh();
      } catch (err) {
        console.error("One click join error:", err);
        setErrorMessage("An unexpected error occurred while joining the workspace.");
        setLoading(false);
      }
    };

    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#EBF5FF] text-[#2563EB] border border-[#BFDBFE]">
              Role: Viewer
            </span>
          </div>

          <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0 mb-2">
            Join {organization.name}
          </h1>
          <p className="font-['Geist',sans-serif] text-[14px] font-normal leading-[20px] text-[#757575] m-0 mb-6">
            You are joining via shareable link with Viewer permissions.
          </p>

          <div className="bg-[#F7F7F7] border border-[#EAEAEA] rounded-[8px] p-3 text-[13px] text-[#757575] mb-6 flex items-center justify-between">
            <span>Signed in as</span>
            <span className="font-semibold text-[#282828]">
              {currentUser.email}
            </span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 mb-4 bg-[#FFF5F5] border border-[#FED7D7] rounded-[8px] text-[13px] text-[#C53030] font-['Geist',sans-serif]"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            id="join-code-one-click-btn"
            disabled={loading}
            onClick={handleOneClickJoin}
            className="w-full h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center text-white font-['Geist',sans-serif] text-[14px] font-medium transition-all cursor-pointer disabled:opacity-75"
            style={{
              boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
              boxSizing: "border-box",
            }}
          >
            {loading ? "Joining workspace..." : `Join ${organization.name}`}
          </button>
        </div>
      </div>
    );
  }

  // State C: Unauthenticated Registration Flow (AC-6, AC-9)
  const handleRegisterAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRequiresLogin(false);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await joinOrganizationByCodeAction({
        inviteCode: code,
        email: email.trim().toLowerCase(),
        name: fullName.trim(),
        password,
      });

      if (!res.success) {
        if (res.requiresLogin) {
          setRequiresLogin(true);
        }
        setErrorMessage(res.error || "Failed to create account and join workspace.");
        setLoading(false);
        return;
      }

      router.push(res.redirectUrl || "/launch");
      router.refresh();
    } catch (err) {
      console.error("joinOrganizationByCodeAction error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#EBF5FF] text-[#2563EB] border border-[#BFDBFE]">
            Role: Viewer
          </span>
        </div>

        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0 mb-2">
          Join {organization.name}
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-normal leading-[20px] text-[#757575] m-0 mb-6">
          Enter your details below to create an account and join the team.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 mb-4 bg-[#FFF5F5] border border-[#FED7D7] rounded-[8px] text-[13px] text-[#C53030] font-['Geist',sans-serif]"
          >
            <p className="m-0">{errorMessage}</p>
            {requiresLogin && (
              <div className="mt-2.5">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
                  className="inline-flex items-center gap-1.5 font-medium text-[#2563EB] hover:underline"
                >
                  Log in to join workspace →
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleRegisterAndJoin} className="space-y-4">
          {/* Email Address Input */}
          <div className="space-y-1.5">
            <label htmlFor="join-email" className="text-[13px] font-medium text-[#282828]">
              Email Address
            </label>
            <input
              id="join-email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[36px] bg-white border border-[#E4E4E4] rounded-[8px] px-3 text-[14px] text-[#282828] focus:border-[#282828] focus:outline-none transition-colors"
            />
          </div>

          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="join-name" className="text-[13px] font-medium text-[#282828]">
              Full Name
            </label>
            <input
              id="join-name"
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-[36px] bg-white border border-[#E4E4E4] rounded-[8px] px-3 text-[14px] text-[#282828] focus:border-[#282828] focus:outline-none transition-colors"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="join-password" className="text-[13px] font-medium text-[#282828]">
              Password
            </label>
            <input
              id="join-password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[36px] bg-white border border-[#E4E4E4] rounded-[8px] px-3 text-[14px] text-[#282828] focus:border-[#282828] focus:outline-none transition-colors"
            />
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="join-confirm-password" className="text-[13px] font-medium text-[#282828]">
              Confirm Password
            </label>
            <input
              id="join-confirm-password"
              type="password"
              required
              minLength={8}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[36px] bg-white border border-[#E4E4E4] rounded-[8px] px-3 text-[14px] text-[#282828] focus:border-[#282828] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            id="register-and-join-code-btn"
            disabled={loading}
            className="w-full h-[36px] mt-2 bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center text-white font-['Geist',sans-serif] text-[14px] font-medium transition-all cursor-pointer disabled:opacity-75"
            style={{
              boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
              boxSizing: "border-box",
            }}
          >
            {loading ? "Creating account & joining..." : "Create Account & Join Team"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#EAEAEA] text-center">
          <p className="text-[13px] text-[#757575] m-0">
            Already have an account?{" "}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
              className="font-medium text-[#282828] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
