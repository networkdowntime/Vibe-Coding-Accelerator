/**
 * Global error handling middleware for Express.js
 * Handles all application errors in a centralized manner
 */

export const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || err.statusCode || 500
  };

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      error.status = 400;
      error.message = 'Validation Error: ' + err.message;
      break;
    
    case 'CastError':
      error.status = 400;
      error.message = 'Invalid data format';
      break;
    
    case 'MongoError':
      if (err.code === 11000) {
        error.status = 409;
        error.message = 'Duplicate entry detected';
      }
      break;
    
    case 'JsonWebTokenError':
      error.status = 401;
      error.message = 'Invalid authentication token';
      break;
    
    case 'TokenExpiredError':
      error.status = 401;
      error.message = 'Authentication token expired';
      break;
    
    case 'MulterError':
      error.status = 400;
      if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File size too large';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error.message = 'Unexpected file field';
      } else {
        error.message = 'File upload error: ' + err.message;
      }
      break;
  }

  // Handle filesystem errors
  if (err.code) {
    switch (err.code) {
      case 'ENOENT':
        error.status = 404;
        error.message = 'File or directory not found';
        break;
      case 'EACCES':
        error.status = 403;
        error.message = 'Permission denied';
        break;
      case 'EEXIST':
        error.status = 409;
        error.message = 'File or directory already exists';
        break;
      case 'ENOTDIR':
        error.status = 400;
        error.message = 'Not a directory';
        break;
      case 'EISDIR':
        error.status = 400;
        error.message = 'Is a directory';
        break;
    }
  }

  // Prepare response
  const response = {
    error: true,
    message: error.message,
    status: error.status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_ERROR_STACK_TRACE === 'true') {
    response.stack = err.stack;
  }

  // Add validation details if available
  if (err.details) {
    response.details = err.details;
  }

  res.status(error.status).json(response);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create a custom error with status code
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error handler
 */
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};
