import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * Sentry's build plugin instruments every module and generates source maps. That is
 * real work on every dev recompile, and pointless locally since a developer's errors
 * shouldn't reach the production issue tracker anyway.
 *
 * So it wraps production builds only. Note this uses the PHASE argument rather than
 * NODE_ENV: Next evaluates this file BEFORE it sets NODE_ENV=production, so checking
 * the env var here silently disables Sentry in production too.
 *
 * Runtime capture is separately gated on a DSN (see sentry.*.config.ts), so nothing
 * is sent from a machine that hasn't configured one.
 */
export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) return nextConfig;

  return withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Keep build output readable; Sentry is chatty by default.
    silent: !process.env.CI,
    // Don't fail a deploy just because source maps couldn't be uploaded.
    errorHandler: () => {},
    // Strip uploaded source maps from the client bundle so app source isn't public.
    sourcemaps: { deleteSourcemapsAfterUpload: true },
    // Routes browser error reports through our own domain, so ad blockers don't
    // silently drop them.
    tunnelRoute: "/monitoring",
  }) as NextConfig;
}
