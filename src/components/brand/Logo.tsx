import React from 'react';

/**
 * BridgeWorkspace brand assets.
 *
 * Redrawn as SVG rather than shipping the raster logo, so the mark stays crisp at
 * any size, inherits the surrounding text colour (`currentColor`) and therefore works
 * unchanged on light and dark backgrounds.
 *
 * The mark: two bridge pylons joined by an arch, with ascending bars beneath —
 * the "bridge" and the "work/metrics" halves of the name.
 */

export function BridgeMark({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="BridgeWorkspace"
    >
      {/* Left pylon */}
      <rect x="4" y="14" width="9" height="40" rx="1.5" fill="currentColor" />
      {/* Right pylon */}
      <rect x="51" y="14" width="9" height="40" rx="1.5" fill="currentColor" />

      {/* Arch spanning the pylons */}
      <path
        d="M8.5 20C8.5 20 12 8 32 8C52 8 55.5 20 55.5 20"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Ascending bars under the span */}
      <rect x="18" y="40" width="8" height="14" rx="1.5" fill="currentColor" />
      <rect x="28" y="32" width="8" height="22" rx="1.5" fill="currentColor" />
      <rect x="38" y="36" width="8" height="18" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Full lockup: mark + wordmark, with "Bridge" bold and "Workspace" regular,
 * matching the brand treatment.
 */
export function BridgeWorkspaceLogo({
  size = 34,
  className = '',
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BridgeMark size={size} />
      {showWordmark && (
        <span
          className="tracking-[-0.02em] leading-none"
          style={{ fontSize: size * 0.62 }}
        >
          <span className="font-extrabold">Bridge</span>
          <span className="font-normal">Workspace</span>
        </span>
      )}
    </span>
  );
}

/** Product name, so copy stays consistent everywhere. */
export const APP_NAME = 'BridgeWorkspace';
