import React from "react";

const FEATURES = [
  "Visual drag-and-drop workflow builder",
  "Connect 100+ apps and integrations",
  "AI-powered automation at every step",
  "Real-time monitoring and analytics",
];

export function FeatureBulletList() {
  return (
    <div className="space-y-3.5">
      {FEATURES.map((feature, idx) => (
        <div key={idx} className="flex items-center gap-3">
          {/* Custom 12x12 bullet frame with strict #757575 & tactile inner shadow */}
          <div
            className="w-3 h-3 rounded-[4px] flex-shrink-0"
            style={{
              backgroundColor: "#757575",
              boxShadow:
                "inset 0 1px 1.5px rgba(255, 255, 255, 0.45), inset 0 -1.5px 2px rgba(0, 0, 0, 0.4)",
            }}
          />
          <span className="text-[13.5px] text-[#334155] font-medium leading-tight">
            {feature}
          </span>
        </div>
      ))}
    </div>
  );
}
