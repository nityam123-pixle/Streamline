import React from "react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
}

export function SubmitButton({
  loading,
  label = "Create Account",
  loadingLabel = "Creating Account...",
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="custom"
      disabled={loading}
      /* Height 36-40px, cornerRadius 8px, Fill #282828, Stroke #B7B7B7, Inner Shadow */
      className="w-full mt-3 h-[38px] rounded-[8px] text-sm shadow-md"
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}
