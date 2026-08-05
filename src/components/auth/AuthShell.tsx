'use client';

import React from 'react';
import Link from 'next/link';
import { BridgeMark } from '@/components/brand/Logo';

/**
 * Shared auth-page shell (login / signup), matching the ClickUp-style reference:
 * a soft pink→blue gradient that fades into white, a centered brand logo,
 * a bold heading with a switch link under it, the form column, and a muted
 * "Need help?" footer pinned to the bottom.
 */

export function AuthShell({
  title,
  switchPrompt,
  switchHref,
  switchLabel,
  children,
}: {
  title: string;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-white text-[#292d34]">
      {/* Top gradient: pink (left) → blue (right), masked so it fades smoothly
          into the white page instead of ending on a hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-gradient-to-r from-[#fbc2d8] via-[#e3cdee] to-[#b9dbf6]"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 18%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 18%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 pt-[13vh] pb-10">
        <BridgeMark size={44} className="text-[#292d34]" />

        <h1 className="mt-5 text-[27px] font-bold tracking-[-0.02em] text-[#292d34]">{title}</h1>

        <p className="mt-1.5 text-[15px] text-[#54575d]">
          {switchPrompt}{' '}
          <Link href={switchHref} className="font-medium text-[#3b82f6] hover:underline">
            {switchLabel}
          </Link>
        </p>

        <div className="mt-7 w-full max-w-[560px]">{children}</div>

        {/* Bottom helper, pinned visually to the page bottom like the reference. */}
        <div className="mt-auto pt-12">
          <Link href="/help-center" className="text-[14px] text-[#7c828d] hover:text-[#54575d]">
            Need help?
          </Link>
        </div>
      </div>
    </main>
  );
}

/** The multicolour Google "G" mark. */
export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
