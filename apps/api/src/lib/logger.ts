import winston from 'winston';

const logDir = process.env.LOG_DIR || 'logs';

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

// In production, also write logs to files
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: `${logDir}/error.log`, level: 'error', maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.File({ filename: `${logDir}/combined.log`, maxsize: 10 * 1024 * 1024, maxFiles: 5 })
  );
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  transports,
});
