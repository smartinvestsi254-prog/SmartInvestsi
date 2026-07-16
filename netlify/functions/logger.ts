import * as winston from 'winston';
import CONFIG from '../../src/config';

const logger = winston.createLogger({
  level: CONFIG.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'netlify-functions' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Sentry crash detection integration (non-destructive: keep winston logging, add capture)
if (process.env.SENTRY_DSN) {
  const originalError = logger.error.bind(logger);
  logger.error = ((msg: any, meta?: any) => {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(msg instanceof Error ? msg : new Error(String(msg)), { extra: meta });
    } catch {
      // Sentry not available; continue with winston logging
    }
    return originalError(msg, meta);
  }) as typeof logger.error;
}

// File transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: '/tmp/prod.log' }));
}

export default logger;