"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth/client";
import { getSafeCallbackUrl } from "@/lib/auth/utils";
import { GoogleIcon, GitHubIcon } from "@/components/icons";
import { FormHeader } from "./FormHeader";
import { SocialButton } from "./SocialButton";
import { FormDivider } from "./FormDivider";
import { InputField } from "./InputField";
import { PasswordField } from "./PasswordField";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await signIn.email({
        email,
        password,
      });

      if (response.error) {
        if (response.error.status === 429) {
          setErrorMessage("Too many failed attempts. Please wait a minute before trying again.");
        } else {
          setErrorMessage(response.error.message || "Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      // Success: redirect to sanitized callback URL
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
        <FormHeader
          title="Welcome back"
          subtitle="Sign in to your Streamline workspace"
        />

        <div className="space-y-2.5 mb-6">
          <SocialButton
            icon={<GoogleIcon className="w-4 h-4" />}
            label="Sign in with Google"
            onClick={() => setErrorMessage("Social login is coming soon.")}
          />
          <SocialButton
            icon={<GitHubIcon className="w-4 h-4" />}
            label="Sign in with GitHub"
            onClick={() => setErrorMessage("Social login is coming soon.")}
          />
        </div>

        <FormDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          {resetSuccess && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium"
            >
              Your password has been reset successfully. Please sign in with your new password.
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium"
            >
              {errorMessage}
            </div>
          )}

          <InputField
            id="login-email"
            label="Work email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordField
            id="login-password"
            label="Password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightElement={
              <Link
                href="/forgot-password"
                className="text-xs text-[#64748B] hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            }
          />

          <SubmitButton
            loading={loading}
            label="Sign In"
            loadingLabel="Signing In..."
          />
        </form>

        <div className="mt-5 text-center text-xs text-[#64748B]">
          <span>Don&apos;t have an account?</span>
          <Link href="/" className="font-semibold text-foreground hover:underline ml-1">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
