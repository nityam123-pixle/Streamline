"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { GoogleIcon, GitHubIcon } from "@/components/icons";
import { FormHeader } from "./FormHeader";
import { SocialButton } from "./SocialButton";
import { FormDivider } from "./FormDivider";
import { InputField } from "./InputField";
import { PasswordField } from "./PasswordField";
import { TermsCheckbox } from "./TermsCheckbox";
import { SubmitButton } from "./SubmitButton";

export function AccountCreationForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("You must agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    try {
      const result = await signUpAction({
        fullName,
        email,
        password,
        confirmPassword,
        agreeTerms,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create account. Please check your inputs.");
        setLoading(false);
        return;
      }

      // Success: advance to onboarding welcome screen
      router.push("/welcome");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      {/* Frame 51 / Frame 49: 446px max width */}
      <div className="w-full max-w-[420px] flex flex-col my-auto py-8">
        
        {/* Frame 35: Header */}
        <FormHeader />

        {/* Frame 38: Social Buttons */}
        <div className="space-y-2.5 mb-6">
          <SocialButton
            icon={<GoogleIcon className="w-4 h-4" />}
            label="Sign up with Google"
            onClick={() => setErrorMessage("Social login is coming soon.")}
          />
          <SocialButton
            icon={<GitHubIcon className="w-4 h-4" />}
            label="Sign up with GitHub"
            onClick={() => setErrorMessage("Social login is coming soon.")}
          />
        </div>

        {/* Frame 39: Divider */}
        <FormDivider />

        {/* Frame 47: Inputs & Actions */}
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
            id="full-name"
            label="Full Name"
            type="text"
            required
            placeholder="e.g., Alex Johnson"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <InputField
            id="work-email"
            label="Work email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordField
            id="password"
            label="Password"
            required
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {/* Frame 46: Terms Checkbox */}
          <TermsCheckbox checked={agreeTerms} onChange={setAgreeTerms} />

          {/* Custom CTA Button using <Button variant="custom"> */}
          <SubmitButton loading={loading} />
        </form>

        {/* Footer Link & Direct Onboarding Link */}
        <div className="mt-5 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
          <div>
            <span>Already have an account?</span>
            <Link href="/login" className="font-semibold text-foreground hover:underline ml-1">
              Sign in
            </Link>
          </div>
          <Link
            href="/welcome"
            className="inline-flex items-center gap-1 text-[11px] text-[#757575] hover:text-[#282828] underline underline-offset-2 transition-colors"
          >
            Preview Onboarding Welcome Screen (Step 1) →
          </Link>
        </div>

      </div>
    </div>
  );
}
