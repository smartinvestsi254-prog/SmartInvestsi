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

// For production, you might want to add file transport or external logging service
if (process.env.NODE_ENV === 'production') {
  // Add additional transports if needed
}

export default logger;