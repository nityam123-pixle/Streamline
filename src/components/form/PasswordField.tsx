"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { AnimatedEyeIcon } from "@/components/icons";

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  rightElement?: React.ReactNode;
}

export function PasswordField({ label, id, rightElement, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-xs font-semibold text-[#282828]">
          {label}
        </label>
        {rightElement}
      </div>
      <div className="relative flex items-center">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          className="pr-11 rounded-[8px] border-[#E2E8F0] text-[#282828]"
          {...props}
        />
        {/* Strictly Centered Toggle Button: inset-y-0 flex items-center avoids transform collision */}
        <div className="absolute inset-y-0 right-3 flex items-center">
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-[#5E5E5E] p-1 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
          >
            <AnimatedEyeIcon
              isOpen={showPassword}
              className="w-[18px] h-[18px]"
              color="#5E5E5E"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
