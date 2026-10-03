import logger from '../config/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms [${ip}]`;

    if (statusCode >= 500) {
      logger.error(message, {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent: req.get('user-agent'),
      });
    } else if (statusCode >= 400) {
      logger.warn(message, {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
      });
    } else {
      logger.http(message, {
        method,
        url: originalUrl,
        statusCode,
        duration,
      });
    }
  });

  next();
};

export default requestLogger;
