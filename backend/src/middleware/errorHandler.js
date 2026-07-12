const ApiError = require('../utils/ApiError');

/**
 * Global Express error handler.
 * Must be mounted LAST with app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {
  // If response already started, delegate to default
  if (res.headersSent) return next(err);

  // Operational errors (ApiError instances)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Prisma known errors
  if (err.code) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${field} already exists.`,
        },
      });
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record was not found.',
        },
      });
    }
    // Foreign key constraint
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Referenced record does not exist.',
        },
      });
    }
  }

  // Unexpected errors — log and return generic message
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
    },
  });
};

module.exports = errorHandler;
