/**
 * Next.js instrumentation hook.
 *
 * Loads the Sentry runtime config that matches the current runtime. Both configs
 * no-op unless a DSN is set, so this is inert until Sentry is actually configured.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Captures errors thrown while rendering App Router routes, server components and
 * server actions — the ones that otherwise only ever reach the server log.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: NodeJS.Dict<string | string[]> },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
}
