import React from "react";

interface IconProps {
  className?: string;
  fill?: string;
}

export function SalesTagIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-45 12 12)">
        <path
          fill={fill}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.8 2.6a1.7 1.7 0 0 1 2.4 0l3.8 3.8a2 2 0 0 1 .6 1.4v9.7a2.5 2.5 0 0 1-2.5 2.5H8.9A2.5 2.5 0 0 1 6.4 17.5V7.8a2 2 0 0 1 .6-1.4l3.8-3.8zM12 6a1.4 1.4 0 1 0 0 2.8A1.4 1.4 0 0 0 12 6zM12 18.8c.4 0 .7-.3.7-.7v-.2c.8-.2 1.4-.8 1.4-1.6 0-1.2-.8-1.7-2.1-2.1-.9-.3-1.1-.5-1.1-.8s.3-.6.9-.6c.7 0 1 .3 1.2.7a.75.75 0 1 0 1.3-.6c-.4-.8-1-1.3-1.8-1.5v-.2a.7.7 0 0 0-1.4 0v.2c-.8.2-1.4.8-1.4 1.6 0 1.2.8 1.7 2.1 2.1.9.3 1.1.5 1.1.8s-.3.6-.9.6c-.7 0-1-.3-1.2-.7a.75.75 0 1 0-1.3.6c.4.8 1 1.3 1.8 1.5v.2a.7.7 0 0 0 .7.7z"
        />
      </g>
    </svg>
  );
}

export function MegaphoneIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={fill}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.5 8.5A1.5 1.5 0 0 0 3 10v4A1.5 1.5 0 0 0 4.5 15.5H7c3.2 0 7 1.6 12.6 4.6a1.4 1.4 0 0 0 2-1.25V5.15a1.4 1.4 0 0 0-2-1.25C14 6.9 10.2 8.5 7 8.5H4.5zM6.5 17a1 1 0 0 1 .96-.7h1.6a1 1 0 0 1 .98 1.22l-.72 3.25a1.2 1.2 0 0 1-1.17.93H6.55a1 1 0 0 1-.98-1.22l.72-3.25a1 1 0 0 1 .21-.23z"
      />
    </svg>
  );
}

export function TargetIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={fill}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

export function BarChartIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={fill}
        d="M3.3 14.1a2.1 2.1 0 0 1 4.2 0v4.8a2.1 2.1 0 0 1-4.2 0v-4.8zM9.9 9.6a2.1 2.1 0 0 1 4.2 0v9.3a2.1 2.1 0 0 1-4.2 0V9.6zM16.5 5.1a2.1 2.1 0 0 1 4.2 0v13.8a2.1 2.1 0 0 1-4.2 0V5.1z"
      />
    </svg>
  );
}

export function UsersIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill={fill} d="M3.6 6.5a4.2 4.2 0 1 0 8.4 0 4.2 4.2 0 1 0-8.4 0Z" />
      <path fill={fill} d="M14.5 7.4a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 1 0-6.8 0Z" />
      <path fill={fill} d="M4.8 14.1H10.8a3.8 3.8 0 0 1 0 7.6H4.8a3.8 3.8 0 0 1 0-7.6Z" />
      <path fill={fill} d="M17.1 14.1H19.6a3.4 3.4 0 0 1 0 6.8H17.1Z" />
    </svg>
  );
}

export function WalletIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={fill}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 7.5A3 3 0 0 1 5 4.5h14a3 3 0 0 1 3 3H2zM2 9.5h20v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7zM6 12.5h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z"
      />
    </svg>
  );
}

export function WebhookIcon({ className = "w-6 h-6", fill = "#000000" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={fill}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.52 8.97A3.5 3.5 0 1 1 14.48 8.97l2.79 5.11a3.5 3.5 0 1 1-2.62 4.42H9.35a3.5 3.5 0 1 1-2.62-4.42zM11.27 9.92l-2.79 5.12a3.5 3.5 0 0 0 .87 1.46h5.3a3.5 3.5 0 0 0 .87-1.46L12.73 9.92a3.5 3.5 0 0 0-1.46 0z"
      />
    </svg>
  );
}

export function AiSparklePinkIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main black sparkle */}
      <path
        fill="#000000"
        d="M 14.35 8.45 c .46 0 .73 .64 .91 1.37 .64 2.56 2.01 3.93 4.57 4.57 .73 .18 1.37 .46 1.37 .91 0 .46 -.64 .73 -1.37 .91 -2.56 .64 -3.93 2.01 -4.57 4.57 -.18 .73 -.46 1.37 -.91 1.37 -.46 0 -.73 -.64 -.91 -1.37 -.64 -2.56 -2.01 -3.93 -4.57 -4.57 -.73 -.18 -1.37 -.46 -1.37 -.91 0 -.46 .64 -.73 1.37 -.91 2.56 -.64 3.93 -2.01 4.57 -4.57 .18 -.73 .46 -1.37 .91 -1.37 z"
      />
      {/* Lower left black sparkle */}
      <path
        fill="#000000"
        d="M 6.6 5.1 c .28 0 .45 .39 .56 .84 .39 1.57 1.23 2.41 2.8 2.8 .45 .11 .84 .28 .84 .56 0 .28 -.39 .45 -.84 .56 -1.57 .39 -2.41 1.23 -2.8 2.8 -.11 .45 -.28 .84 -.56 .84 -.28 0 -.45 -.39 -.56 -.84 -.39 -1.57 -1.23 -2.41 -2.8 -2.8 -.45 -.11 -.84 -.28 -.84 -.56 0 -.28 .39 -.45 .84 -.56 1.57 -.39 2.41 -1.23 2.8 -2.8 .11 -.45 .28 -.84 .56 -.84 z"
      />
      {/* Upper right tiny pink sparkle star accent from Figma reference artwork */}
      <path
        fill="#FF4D8D"
        d="M 14.1 1.9 c .18 1.06 1.14 2.02 2.2 2.2 -1.06 .18 -2.02 1.14 -2.2 2.2 -.18 -1.06 -1.14 -2.02 -2.2 -2.2 1.06 -.18 2.02 -1.14 2.2 -2.2 z"
      />
    </svg>
  );
}
