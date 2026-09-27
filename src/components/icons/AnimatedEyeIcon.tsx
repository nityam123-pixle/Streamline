"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedEyeIconProps {
  isOpen: boolean;
  className?: string;
  color?: string;
}

export function AnimatedEyeIcon({
  isOpen,
  className = "w-4 h-4",
  color = "#5E5E5E",
}: AnimatedEyeIconProps) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          /* STRICT eye-open.svg from public/icons/eye-open.svg with spring animation */
          <motion.svg
            key="eye-open"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-full h-full"
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.75, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.75, rotate: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Outer eye contour */}
            <motion.path
              d="M2.5 12c0 0 3.5-7 9.5-7s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
              initial={{ pathLength: 0.4 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
            {/* Center pupil */}
            <motion.circle
              cx="12"
              cy="12"
              r="3.2"
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 450, damping: 22, delay: 0.04 }}
              style={{ originX: "12px", originY: "12px" }}
            />
          </motion.svg>
        ) : (
          /* STRICT eye-closed.svg from public/icons/eye-closed.svg with animation */
          <motion.svg
            key="eye-closed"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-full h-full"
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.75, rotate: 6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.75, rotate: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.path
              d="M3 9c2.5 6 15.5 6 18 0M5.5 12.5L3 16.5M9.5 14.5L8.5 19.5M14.5 14.5L15.5 19.5M18.5 12.5L21 16.5"
              initial={{ pathLength: 0.7 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}
