import React from 'react';
import { useLogos } from '../context/LogoContext';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'color' | 'monochrome';
}

/**
 * WebDrop abstract connecting nexus mark.
 * Represents two entities seamlessly docking and exchanging data.
 * Pure geometric curves; no literal water drop, cloud, arrow, or screen.
 */
export const WebDropLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'color'
}) => {
  const isMono = variant === 'monochrome';

  // Safely attempt to read custom logo from context
  let customAppLogo: string | null = null;
  try {
    const { logos } = useLogos();
    customAppLogo = logos.app_logo;
  } catch (err) {
    // Graceful fallback if rendered outside provider (e.g. tests)
  }

  if (customAppLogo) {
    return (
      <img
        src={customAppLogo}
        alt="WebDrop Logo"
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 rounded-lg select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-colors ${className}`}
      aria-hidden="true"
    >
      <defs>
        {!isMono && (
          <>
            <linearGradient id="wd-logo-node1" x1="120" y1="140" x2="280" y2="300" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="wd-logo-node2" x1="232" y1="212" x2="392" y2="372" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* Primary interacting locus */}
      <path
        d="M148 184 C148 135 188 96 237 96 C286 96 326 135 326 184 C326 215 310 242 286 256 C264 269 256 288 256 312 L256 328 C256 348 240 364 220 364 C200 364 184 348 184 328 L184 312 C184 278 198 250 224 234 C244 222 254 204 254 184 C254 174 246 166 237 166 C227 166 220 174 220 184 C220 200 206 214 190 214 C174 214 160 200 160 184 Z"
        fill={isMono ? 'currentColor' : 'url(#wd-logo-node1)'}
        opacity={isMono ? 0.9 : 0.96}
      />

      {/* Complementary interacting locus */}
      <path
        d="M364 328 C364 377 324 416 275 416 C226 416 186 377 186 328 C186 297 202 270 226 256 C248 243 256 224 256 200 L256 184 C256 164 272 148 292 148 C312 148 328 164 328 184 L328 200 C328 234 314 262 288 278 C268 290 258 308 258 328 C258 338 266 346 275 346 C285 346 292 338 292 328 C292 312 306 298 322 298 C338 298 352 312 352 328 Z"
        fill={isMono ? 'currentColor' : 'url(#wd-logo-node2)'}
        opacity={isMono ? 0.9 : 0.96}
      />

      {/* Center dynamic contact nexus */}
      <circle
        cx="256"
        cy="256"
        r="28"
        fill={isMono ? 'currentColor' : '#0EA5E9'}
        fillOpacity={isMono ? 0.2 : 0.25}
      />
      <circle
        cx="256"
        cy="256"
        r="14"
        fill={isMono ? 'currentColor' : '#06B6D4'}
      />
    </svg>
  );
};
