'use client';

import React, { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AiAgentCentralCard } from "./AiAgentCentralCard";
import { IntegrationNodeCard } from "./IntegrationNodeCard";
import { WorkspaceReadyCard } from "./WorkspaceReadyCard";

export function LaunchStepVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;

      const scaleX = (w - 40) / 392;
      const scaleY = (h - 40) / 443;
      const optimalScale = Math.min(1, Math.max(0.65, Math.min(scaleX, scaleY)));
      setScale(optimalScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Motion variants for smooth step 6 reveal
  const centerCardVariants = {
    hidden: { scale: shouldReduceMotion ? 1 : 0.88, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.45,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  const nodeVariants = (offsetX: number, offsetY: number, delay: number) => ({
    hidden: {
      x: shouldReduceMotion ? 0 : offsetX,
      y: shouldReduceMotion ? 0 : offsetY,
      scale: shouldReduceMotion ? 1 : 0.8,
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.42,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  });

  const connectorVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.35,
        delay: shouldReduceMotion ? 0 : 0.18,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  };

  const workspaceCardVariants = {
    hidden: {
      y: shouldReduceMotion ? 0 : 18,
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.96,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.42,
        delay: shouldReduceMotion ? 0 : 0.28,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-0 relative flex items-center justify-center overflow-hidden flex-shrink-0 select-none"
      style={{ boxSizing: "border-box" }}
    >
      {/* DIAGRAM CONTAINER (Frame 138): 392 × 443 coordinate space */}
      <div
        className="w-[392px] h-[443px] relative flex-shrink-0 z-10 transition-transform duration-150"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          boxSizing: "border-box",
        }}
      >
        {/* ================= SVG CONNECTOR LAYER ================= */}
        <motion.svg
          variants={connectorVariants}
          initial="hidden"
          animate="visible"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 392 443"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* DECORATIVE POLYGON (Polygon 1): 20 × 20, 120° rotation, fill #FFFFFF */}
          <polygon
            points="10,0 20,18 0,18"
            fill="#FFFFFF"
            opacity="0.9"
            transform="translate(186, 215) rotate(120 10 9)"
          />

          {/* 1. TOP LINE: Gmail -> AI Agent (Rotation 90°) */}
          <line
            x1="196"
            y1="78"
            x2="196"
            y2="124"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="196" cy="78" r="4.5" fill="#328EFB" />
          <circle cx="196" cy="124" r="4.5" fill="#328EFB" />

          {/* 2. UPPER-LEFT LINE: Slack -> AI Agent (Rotation -150°) */}
          <line
            x1="73"
            y1="117"
            x2="109"
            y2="138.5"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="73" cy="117" r="4.5" fill="#328EFB" />
          <circle cx="109" cy="138.5" r="4.5" fill="#328EFB" />

          {/* 3. UPPER-RIGHT LINE: AI Agent -> Notion (Rotation -30°) */}
          <line
            x1="283"
            y1="138.5"
            x2="319"
            y2="117"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="283" cy="138.5" r="4.5" fill="#328EFB" />
          <circle cx="319" cy="117" r="4.5" fill="#328EFB" />

          {/* 4. LOWER LINE: AI Agent -> Workspace Ready (Rotation -90°) */}
          <line
            x1="196"
            y1="294"
            x2="196"
            y2="334"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="196" cy="294" r="4.5" fill="#328EFB" />
          <circle cx="196" cy="334" r="4.5" fill="#328EFB" />

          {/* 5. LOWER-LEFT LINE: AI Agent -> Drive (Rotation 150°) */}
          <line
            x1="109"
            y1="277"
            x2="73"
            y2="299"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="109" cy="277" r="4.5" fill="#328EFB" />
          <circle cx="73" cy="299" r="4.5" fill="#328EFB" />

          {/* 6. LOWER-RIGHT LINE: AI Agent -> HubSpot (Rotation 30°) */}
          <line
            x1="283"
            y1="277"
            x2="319"
            y2="299"
            stroke="#328EFB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <circle cx="283" cy="277" r="4.5" fill="#328EFB" />
          <circle cx="319" cy="299" r="4.5" fill="#328EFB" />
        </motion.svg>

        {/* ================= 1. GMAIL (TOP) ================= */}
        {/* Frame 70: 60 × 60px, x: 166, y: 0 */}
        <motion.div
          variants={nodeVariants(0, -16, 0.16)}
          initial="hidden"
          animate="visible"
          className="absolute left-[166px] top-[0px] z-10"
        >
          <IntegrationNodeCard
            name="Gmail"
            icon={
              <img
                src="/icons/socials/gmail.svg"
                alt="Gmail"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
          />
        </motion.div>

        {/* ================= 2. SLACK (UPPER-LEFT) ================= */}
        {/* Frame 73: 60 × 60px, x: 2, y: 49 */}
        <motion.div
          variants={nodeVariants(-16, -10, 0.2)}
          initial="hidden"
          animate="visible"
          className="absolute left-[2px] top-[49px] z-10"
        >
          <IntegrationNodeCard
            name="Slack"
            icon={
              <img
                src="/icons/socials/slack.svg"
                alt="Slack"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
          />
        </motion.div>

        {/* ================= 3. NOTION (UPPER-RIGHT) ================= */}
        {/* Frame 74: 60 × 60px, x: 330, y: 49 */}
        <motion.div
          variants={nodeVariants(16, -10, 0.2)}
          initial="hidden"
          animate="visible"
          className="absolute left-[330px] top-[49px] z-10"
        >
          <IntegrationNodeCard
            name="Notion"
            icon={
              <img
                src="/icons/socials/notion.svg"
                alt="Notion"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
          />
        </motion.div>

        {/* ================= 4. CENTRAL AI AGENT ================= */}
        {/* Frame 78: 136 × 126px, x: 128, y: 147 */}
        <motion.div
          variants={centerCardVariants}
          initial="hidden"
          animate="visible"
          className="absolute left-[128px] top-[147px] z-20"
        >
          <AiAgentCentralCard />
        </motion.div>

        {/* ================= 5. GOOGLE DRIVE (LOWER-LEFT) ================= */}
        {/* Frame 72: 60 × 60px, x: 2, y: 310 */}
        <motion.div
          variants={nodeVariants(-16, 12, 0.24)}
          initial="hidden"
          animate="visible"
          className="absolute left-[2px] top-[310px] z-10"
        >
          <IntegrationNodeCard
            name="Google Drive"
            icon={
              <img
                src="/icons/socials/google-drive.svg"
                alt="Google Drive"
                width={28}
                height={28}
                className="w-[28px] h-[28px] object-contain block select-none"
              />
            }
          />
        </motion.div>

        {/* ================= 6. HUBSPOT (LOWER-RIGHT) ================= */}
        {/* Frame 79: 60 × 60px, x: 330, y: 310 */}
        <motion.div
          variants={nodeVariants(16, 12, 0.24)}
          initial="hidden"
          animate="visible"
          className="absolute left-[330px] top-[310px] z-10"
        >
          <IntegrationNodeCard
            name="HubSpot"
            icon={
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="w-[28px] h-[28px] fill-[#FF7A59]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z" />
              </svg>
            }
          />
        </motion.div>

        {/* ================= 7. WORKSPACE READY CARD ================= */}
        {/* Frame 80: 205 × 74px, x: 93.5, y: 356 */}
        <motion.div
          variants={workspaceCardVariants}
          initial="hidden"
          animate="visible"
          className="absolute left-[93.5px] top-[356px] z-10"
        >
          <WorkspaceReadyCard />
        </motion.div>
      </div>
    </div>
  );
}
