import * as Sentry from '@sentry/nextjs';

/**
 * Browser error reporting. Only the NEXT_PUBLIC_ DSN is usable here (it is embedded
 * in the bundle); a Sentry DSN is safe to expose, it is write-only by design.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    sendDefaultPii: false,
    // Session Replay is off by default: it records user screens, which for this app
    // would capture client data, time-tracking screenshots and chat content.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
