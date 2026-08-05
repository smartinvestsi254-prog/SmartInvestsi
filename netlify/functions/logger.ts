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

// Sentry crash detection integration\nif (process.env.SENTRY_DSN) {\n  logger.error = (msg, meta) => {\n    const Sentry = require('@sentry/serverless');\n    Sentry.captureException(new Error(msg), { extra: meta });\n  };\n}\n\n// File transport prod\nif (process.env.NODE_ENV === 'production') {\n  logger.add(new winston.transports.File({ filename: '/tmp/prod.log' }));\n}

export default logger;