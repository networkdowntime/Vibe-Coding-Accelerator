/**
 * Request logging middleware
 * Provides detailed logging of incoming requests
 */

export const requestLogger = (req, res, next) => {
  // Only log if enabled in environment
  if (process.env.ENABLE_REQUEST_LOGGING !== 'true') {
    return next();
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log request details
  console.log(`📥 [${timestamp}] ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const responseTimestamp = new Date().toISOString();
    
    console.log(`📤 [${responseTimestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type')
    });

    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * API response time middleware
 */
export const responseTime = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    
    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.originalUrl} took ${duration.toFixed(2)}ms`);
    }
  });

  next();
};

/**
 * Request ID middleware for tracking requests
 */
export const requestId = (req, res, next) => {
  const requestId = req.get('X-Request-ID') || generateRequestId();
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
