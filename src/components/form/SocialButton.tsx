import React from "react";
import { Button } from "@/components/ui/button";

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full h-10 px-4 rounded-xl border-input bg-background hover:bg-slate-50 text-[13.5px] font-medium text-[#282828] flex items-center justify-center gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
