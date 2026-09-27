"use client";

import React, { useRef, useState, useEffect } from "react";
import { TestimonialCard } from "./TestimonialCard";

export function AboutStepVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scaleX = (w - 48) / 440;
      const scaleY = (h - 48) / 208;
      const optimalScale = Math.min(1, Math.max(0.65, Math.min(scaleX, scaleY)));
      setScale(optimalScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-0 relative flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      <div
        className="relative z-10 select-none transition-transform duration-150 flex items-center justify-center"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <TestimonialCard />
      </div>
    </div>
  );
}
