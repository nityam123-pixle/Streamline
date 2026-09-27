"use client";

import React, { useRef, useState, useEffect } from "react";
import { IntegrationNode } from "./IntegrationNode";
import { AiAgentHeroCard } from "./AiAgentHeroCard";
import { CanvasMetricsRow } from "./CanvasMetricsRow";

export function WelcomeStepVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scaleX = (w - 48) / 468;
      const scaleY = (h - 48) / 604;
      const optimalScale = Math.min(1, Math.max(0.55, Math.min(scaleX, scaleY)));
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
      {/* ILLUSTRATION COMPOSITION: 468 × 604 coordinate space, responsive scale for tablet & desktop */}
      <div
        className="w-[468px] h-[604px] relative flex-shrink-0 z-10 select-none transition-transform duration-150"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          boxSizing: "border-box",
        }}
      >
        {/* ================= SVG CONNECTOR LAYER ================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 468 604"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* TOP: Gmail (bottom y=60) -> AI Agent (top y=145). 12px gaps: (234, 72) -> (234, 133) */}
          <line
            x1="234"
            y1="72"
            x2="234"
            y2="133"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <circle cx="234" cy="72" r="4.5" fill="#328EFB" />
          <circle cx="234" cy="133" r="4.5" fill="#328EFB" />

          {/* LEFT: Drive (right x=81) -> AI Agent (left x=166). 12px gaps: (93, 208) -> (154, 208) */}
          <line
            x1="93"
            y1="208"
            x2="154"
            y2="208"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <circle cx="93" cy="208" r="4.5" fill="#328EFB" />
          <circle cx="154" cy="208" r="4.5" fill="#328EFB" />

          {/* RIGHT: AI Agent (right x=302) -> Discord (left x=387). 12px gaps: (314, 208) -> (375, 208) */}
          <line
            x1="314"
            y1="208"
            x2="375"
            y2="208"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <circle cx="314" cy="208" r="4.5" fill="#328EFB" />
          <circle cx="375" cy="208" r="4.5" fill="#328EFB" />

          {/* AI -> LOWER NETWORK: Upper bus (y=328) with Slack (98, 365), Notion (234, 365), Sheets (385, 365) */}
          <path
            d="M 98 365 L 98 336 Q 98 328 106 328 L 377 328 Q 385 328 385 336 L 385 365"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
            fill="none"
          />
          <line
            x1="234"
            y1="283"
            x2="234"
            y2="365"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <circle cx="234" cy="283" r="4.5" fill="#328EFB" />
          <circle cx="98" cy="365" r="4.5" fill="#328EFB" />
          <circle cx="234" cy="365" r="4.5" fill="#328EFB" />
          <circle cx="385" cy="365" r="4.5" fill="#328EFB" />

          {/* LOWER RETURN LOOP: Slack (98, 449), Notion (234, 449), Sheets (385, 449) to loop (y=484), stem to terminal dot (234, 524) */}
          <path
            d="M 98 449 L 98 476 Q 98 484 106 484 L 377 484 Q 385 484 385 476 L 385 449"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
            fill="none"
          />
          <line
            x1="234"
            y1="449"
            x2="234"
            y2="524"
            stroke="#328EFB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <circle cx="98" cy="449" r="4.5" fill="#328EFB" />
          <circle cx="234" cy="449" r="4.5" fill="#328EFB" />
          <circle cx="385" cy="449" r="4.5" fill="#328EFB" />
          <circle cx="234" cy="524" r="4.5" fill="#328EFB" />
        </svg>

        {/* ================= OUTER INTEGRATION CARDS ================= */}
        {/* MAIL: x: 204, y: 0 */}
        <div className="absolute left-[204px] top-[0px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/gmail.svg"
                alt="Mail"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Mail"
          />
        </div>

        {/* DISCORD: x: 387, y: 178 */}
        <div className="absolute left-[387px] top-[178px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/discord.svg"
                alt="Discord"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Discord"
          />
        </div>

        {/* DRIVE: x: 21, y: 178 */}
        <div className="absolute left-[21px] top-[178px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/google-drive.svg"
                alt="Drive"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Drive"
          />
        </div>

        {/* SLACK: x: 68, y: 377 */}
        <div className="absolute left-[68px] top-[377px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/slack.svg"
                alt="Slack"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Slack"
          />
        </div>

        {/* NOTION: x: 204, y: 377 */}
        <div className="absolute left-[204px] top-[377px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/notion.svg"
                alt="Notion"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Notion"
          />
        </div>

        {/* GOOGLE SHEETS: x: 355, y: 377 */}
        <div className="absolute left-[355px] top-[377px] z-10">
          <IntegrationNode
            icon={
              <img
                src="/icons/socials/google-sheets.svg"
                alt="Sheets"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
            label="Sheets"
          />
        </div>

        {/* ================= CENTER AI AGENT CARD ================= */}
        <div className="absolute left-[166px] top-[145px] z-20">
          <AiAgentHeroCard />
        </div>

        {/* ================= RIGHT METRICS ROW ================= */}
        <div className="absolute left-[0px] top-[544px] z-10">
          <CanvasMetricsRow />
        </div>
      </div>
    </div>
  );
}
