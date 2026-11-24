import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

// Server Components, route handlers and proxy.ts. Without a DSN the SDK is not
// initialised and this is a no-op.
export const onRequestError = Sentry.captureRequestError;
