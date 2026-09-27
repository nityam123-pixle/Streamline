interface FormHeaderProps {
  title?: string;
  subtitle?: string;
}

export function FormHeader({
  title = "Create your account",
  subtitle = "Start automating for free — no credit card required",
}: FormHeaderProps) {
  return (
    <div className="mb-7">
      <h2 className="text-[24px] font-semibold text-[#282828] tracking-[-0.015em] leading-[32px] mb-1">
        {title}
      </h2>
      <p className="text-[14px] font-medium text-[#757575] leading-[16px] tracking-[-0.015em]">
        {subtitle}
      </p>
    </div>
  );
}
