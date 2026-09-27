import React from "react";

export function TestimonialCard() {
  return (
    <div
      className="w-[440px] max-w-full h-[208px] bg-white border border-[#EAEAEA] rounded-[12px] p-[28px] flex flex-col justify-between flex-shrink-0 select-none"
      style={{
        boxShadow: "0 3px 6px 0 rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box",
      }}
    >
      {/* Testimonial Quote: exactly 384px text width */}
      <p className="w-[384px] max-w-full font-['Geist',sans-serif] text-[16px] font-medium leading-[24px] tracking-[-0.0015em] text-[#282828] m-0 text-left">
        &ldquo; Streamline cut our manual ops work by 80%. Our team now focuses on strategy, not busywork. It’s completely changed how we and plan for growth.&rdquo;
      </p>

      {/* Author Row */}
      <div className="flex items-center gap-[12px] h-[36px] flex-shrink-0">
        <div className="w-[36px] h-[36px] rounded-full overflow-hidden border border-[#EAEAEA] flex-shrink-0 bg-[#282828]">
          <img
            src="/Sara.svg"
            alt="Sarah Chen"
            width={36}
            height={36}
            className="w-full h-full object-cover block select-none"
          />
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828]">
            Sarah Chen
          </span>
          <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575]">
            Operations Manager
          </span>
        </div>
      </div>
    </div>
  );
}
