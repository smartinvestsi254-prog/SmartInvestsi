import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN || '';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    sendDefaultPii: false,
    environment: process.env.NODE_ENV || 'production',
  });
}

type AnyHandler = (event: any, context: any) => any;

export function wrapHandler(handler: AnyHandler): AnyHandler {
  return async (event: any, context: any) => {
    try {
      return await handler(event, context);
    } catch (err) {
      if (SENTRY_DSN) {
        Sentry.captureException(err);
        await Sentry.flush(2000);
      }
      throw err;
    }
  };
}

const SentryInit = {
  ...Sentry,
  wrapHandler,
};

export default SentryInit;
