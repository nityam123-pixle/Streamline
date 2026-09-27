import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function TermsCheckbox({ checked, onChange }: TermsCheckboxProps) {
  return (
    <div className="flex items-start gap-2.5 pt-1">
      <Checkbox
        id="terms-checkbox"
        checked={checked}
        onCheckedChange={(val) => onChange(!!val)}
        className="mt-1"
      />
      <label htmlFor="terms-checkbox" className="text-xs text-[#64748B] leading-[1.5] cursor-pointer select-none">
        I agree to Streamline’s{" "}
        <a href="#" className="font-semibold text-foreground hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="font-semibold text-foreground hover:underline">
          Privacy Policy
        </a>
      </label>
    </div>
  );
}
