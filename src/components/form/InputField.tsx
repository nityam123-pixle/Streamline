import React from "react";
import { Input } from "@/components/ui/input";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export function InputField({ label, id, ...props }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <Input id={id} {...props} />
    </div>
  );
}
