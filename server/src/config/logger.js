import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for readable console output in development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}]: ${message}${metaStr}`;
  })
);

// Structured JSON format for log aggregation / files
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports configuration
const transports = [
  new winston.transports.Console({
    level: isProduction ? 'info' : 'debug',
    format: isProduction ? jsonFormat : consoleFormat,
    silent: isTest && !process.env.DEBUG_TESTS,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: jsonFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    level: 'info',
    format: jsonFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }),
];

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: jsonFormat,
  defaultMeta: { service: 'blood-donation-api' },
  transports,
  exitOnError: false,
});

export default logger;
