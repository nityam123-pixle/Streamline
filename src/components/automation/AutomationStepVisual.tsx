'use client';

import React, { useRef, useState, useEffect } from "react";
import {
  MegaphoneIcon,
  TargetIcon,
  BarChartIcon,
  UsersIcon,
  WalletIcon,
  WebhookIcon,
  AiSparklePinkIcon,
} from "./AutomationIcons";

export function AutomationStepVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scaleX = (w - 32) / 480;
      const scaleY = h / 1024;
      const optimalScale = Math.min(1, Math.max(0.5, Math.min(scaleX, scaleY)));
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
      className="w-full h-full min-h-0 relative flex items-start justify-center overflow-hidden flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      {/* 480 × 1024 COORDINATE SPACE FOR DIAGRAM: Perfectly aligns with Left Panel */}
      <div
        className="w-[480px] h-[1024px] relative flex-shrink-0 z-10 select-none transition-transform duration-150"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          boxSizing: "border-box",
        }}
      >
        {/* ================= SVG CONNECTOR LAYER (z-0) ================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 480 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ================= TOP CONNECTORS ================= */}
          {/* From Megaphone (x=202) & Target (x=278) bottom (y=160) down to Webhook (y=250) */}
          <path
            d="M 202 178 L 202 200 Q 202 206 208 206 L 272 206 Q 278 206 278 200 L 278 178"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            fill="none"
          />
          <line
            x1="240"
            y1="206"
            x2="240"
            y2="230"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="202" cy="178" r="4.5" fill="#328EFB" />
          <circle cx="278" cy="178" r="4.5" fill="#328EFB" />
          <circle cx="240" cy="230" r="4.5" fill="#328EFB" />

          {/* ================= 4 VERTICAL CONNECTORS (UPPER) ================= */}
          {/* Upper Webhooks (bottom y=306) -> Central Automation (top y=417) */}
          {/* 20px gap on both sides: span from y=326 to y=397 (height=71px) */}
          {/* Line 1 (x=190): TOP HAS CIRCLE DOT, BOTTOM NO DOT */}
          <line
            x1="190"
            y1="326"
            x2="190"
            y2="397"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="190" cy="326" r="4.5" fill="#328EFB" />

          {/* Line 2 (x=210): TOP NO DOT, BOTTOM HAS CIRCLE DOT */}
          <line
            x1="210"
            y1="326"
            x2="210"
            y2="397"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="210" cy="397" r="4.5" fill="#328EFB" />

          {/* Line 3 (x=270): TOP HAS CIRCLE DOT, BOTTOM NO DOT */}
          <line
            x1="270"
            y1="326"
            x2="270"
            y2="397"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="270" cy="326" r="4.5" fill="#328EFB" />

          {/* Line 4 (x=290): TOP NO DOT, BOTTOM HAS CIRCLE DOT */}
          <line
            x1="290"
            y1="326"
            x2="290"
            y2="397"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="290" cy="397" r="4.5" fill="#328EFB" />

          {/* ================= SIDE DUAL HORIZONTAL CONNECTORS ================= */}
          {/* LEFT: Left Analytics (right x=70) -> Central Automation (left x=172) */}
          {/* Span from x=92 to x=150 (22px gap on each side) */}
          {/* Upper line (y=457): LEFT HAS CIRCLE DOT, RIGHT NO DOT */}
          <line
            x1="92"
            y1="457"
            x2="150"
            y2="457"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="92" cy="457" r="4.5" fill="#328EFB" />

          {/* Lower line (y=473): LEFT NO DOT, RIGHT HAS CIRCLE DOT */}
          <line
            x1="92"
            y1="473"
            x2="150"
            y2="473"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="150" cy="473" r="4.5" fill="#328EFB" />

          {/* RIGHT: Central Automation (right x=308) -> Right Analytics (left x=410) */}
          {/* Span from x=330 to x=388 (22px gap on each side) */}
          {/* Upper line (y=457): LEFT NO DOT, RIGHT HAS CIRCLE DOT */}
          <line
            x1="330"
            y1="457"
            x2="388"
            y2="457"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="388" cy="457" r="4.5" fill="#328EFB" />

          {/* Lower line (y=473): LEFT HAS CIRCLE DOT, RIGHT NO DOT */}
          <line
            x1="330"
            y1="473"
            x2="388"
            y2="473"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="330" cy="473" r="4.5" fill="#328EFB" />

          {/* ================= 4 VERTICAL CONNECTORS (LOWER) ================= */}
          {/* Central Automation (bottom y=513) -> Lower Webhooks (top y=624) */}
          {/* 20px gap on both sides: span from y=533 to y=604 (height=71px) */}
          {/* Line 1 (x=190): TOP NO DOT, BOTTOM HAS CIRCLE DOT */}
          <line
            x1="190"
            y1="533"
            x2="190"
            y2="604"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="190" cy="604" r="4.5" fill="#328EFB" />

          {/* Line 2 (x=210): TOP HAS CIRCLE DOT, BOTTOM NO DOT */}
          <line
            x1="210"
            y1="533"
            x2="210"
            y2="604"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="210" cy="533" r="4.5" fill="#328EFB" />

          {/* Line 3 (x=270): TOP NO DOT, BOTTOM HAS CIRCLE DOT */}
          <line
            x1="270"
            y1="533"
            x2="270"
            y2="604"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="270" cy="604" r="4.5" fill="#328EFB" />

          {/* Line 4 (x=290): TOP HAS CIRCLE DOT, BOTTOM NO DOT */}
          <line
            x1="290"
            y1="533"
            x2="290"
            y2="604"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <circle cx="290" cy="533" r="4.5" fill="#328EFB" />

          {/* ================= BOTTOM CONNECTORS ================= */}
          {/* From Lower Webhooks (bottom y=680) down to Wallet (x=202) & Users (x=278) (top y=770) */}
          <line
            x1="240"
            y1="700"
            x2="240"
            y2="724"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
          />
          <path
            d="M 202 752 L 202 730 Q 202 724 208 724 L 272 724 Q 278 724 278 730 L 278 752"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            fill="none"
          />
          <circle cx="240" cy="700" r="4.5" fill="#328EFB" />
          <circle cx="202" cy="752" r="4.5" fill="#328EFB" />
          <circle cx="278" cy="752" r="4.5" fill="#328EFB" />
        </svg>

        {/* ================= 1. TOP INPUT GROUP (y = 100px) ================= */}
        {/* Starts in empty space between Logo (y=51-83px) and Heading (y=139px) */}
        {/* Megaphone: x = 172px */}
        <div
          className="absolute left-[172px] top-[100px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <MegaphoneIcon className="w-[24px] h-[24px]" fill="#000000" />
        </div>

        {/* Target: x = 248px */}
        <div
          className="absolute left-[248px] top-[100px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <TargetIcon className="w-[24px] h-[24px]" fill="#000000" />
        </div>

        {/* ================= 2. UPPER WEBHOOK CARD (y = 250px) ================= */}
        <div
          className="absolute left-[149px] top-[250px] w-[182px] h-[56px] bg-white rounded-[8px] border border-[#EAEAEA] px-[12px] py-[12px] flex items-center gap-[12px] z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <div className="w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
            <WebhookIcon className="w-[24px] h-[24px]" fill="#000000" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-['Geist',sans-serif] text-[13px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] truncate block">
              Webhooks
            </span>
            <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] truncate block">
              Webhooks response
            </span>
          </div>
        </div>

        {/* ================= 3. SIDE ANALYTICS NODES (centerY = 465px, y = 435px) ================= */}
        {/* Left Analytics: x = 10px */}
        <div
          className="absolute left-[10px] top-[435px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <BarChartIcon className="w-[28px] h-[28px]" fill="#000000" />
        </div>

        {/* Right Analytics: x = 410px */}
        <div
          className="absolute left-[410px] top-[435px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <BarChartIcon className="w-[28px] h-[28px]" fill="#000000" />
        </div>

        {/* ================= 4. CENTRAL AUTOMATION NODE (y = 417px) ================= */}
        <div
          className="absolute left-[172px] top-[417px] w-[136px] h-[96px] rounded-[12px] flex flex-col items-center justify-center gap-[6px] z-20"
          style={{
            boxSizing: "border-box",
            border: "1.5px solid transparent",
            background: `
              linear-gradient(#FFFFFF, #FFFFFF) padding-box,
              linear-gradient(to bottom left, #282828 0%, rgba(40, 40, 40, 0) 100%) border-box,
              linear-gradient(to top right, rgba(50, 142, 251, 0.5) 0%, rgba(50, 142, 251, 0) 100%) border-box
            `,
            boxShadow: "0 2px 20px 0 rgba(133, 191, 255, 0.45)",
          }}
        >
          {/* Inner 44 × 44 icon tile */}
          <div
            className="w-[44px] h-[44px] bg-[#E4E4E4] rounded-[10px] border border-[#EAEAEA] flex items-center justify-center flex-shrink-0"
            style={{
              boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
              boxSizing: "border-box",
            }}
          >
            <AiSparklePinkIcon className="w-[24px] h-[24px]" />
          </div>

          {/* Label: Automation */}
          <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] text-[#000000] text-center select-none block tracking-[-0.0015em]">
            Automation
          </span>
        </div>

        {/* ================= 5. LOWER WEBHOOK CARD (y = 624px) ================= */}
        <div
          className="absolute left-[149px] top-[624px] w-[182px] h-[56px] bg-white rounded-[8px] border border-[#EAEAEA] px-[12px] py-[12px] flex items-center gap-[12px] z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <div className="w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
            <WebhookIcon className="w-[24px] h-[24px]" fill="#000000" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-['Geist',sans-serif] text-[13px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] truncate block">
              Webhooks
            </span>
            <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] truncate block">
              Webhooks response
            </span>
          </div>
        </div>

        {/* ================= 6. BOTTOM OUTPUT GROUP (y = 770px) ================= */}
        {/* Exactly finishes at y = 770 + 60 = 830px (matching bottom of Looks good button) */}
        {/* Wallet: x = 172px */}
        <div
          className="absolute left-[172px] top-[770px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <WalletIcon className="w-[24px] h-[24px]" fill="#000000" />
        </div>

        {/* Users: x = 248px */}
        <div
          className="absolute left-[248px] top-[770px] w-[60px] h-[60px] bg-white rounded-[10px] border border-[#EAEAEA] flex items-center justify-center z-10"
          style={{
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
          }}
        >
          <UsersIcon className="w-[24px] h-[24px]" fill="#000000" />
        </div>
      </div>
    </div>
  );
}
