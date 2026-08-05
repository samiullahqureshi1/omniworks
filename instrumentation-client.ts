// Browser-side Sentry init (Next.js loads this automatically on the client).
import * as Sentry from '@sentry/nextjs';
import './sentry.client.config';

/** Lets Sentry tie errors to the client-side navigation that triggered them. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
