import * as Sentry from '@sentry/nextjs';

/**
 * Server-side error reporting.
 *
 * Everything here is gated on SENTRY_DSN being set: without it `init` is skipped
 * entirely, so the app runs exactly as before and no data leaves the machine. That
 * keeps local development and any deployment without Sentry completely unaffected.
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Sample traces lightly — this app's throughput budget is small.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    // Never ship request bodies or headers: they can contain session cookies,
    // passwords and customer data.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}
