class ApiError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || ApiError.codeFromStatus(statusCode);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static codeFromStatus(status) {
    const map = {
      400: 'VALIDATION_ERROR',
      401: 'AUTHENTICATION_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'RESOURCE_UNAVAILABLE',
      423: 'INVALID_STATE_TRANSITION',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] || 'INTERNAL_SERVER_ERROR';
  }

  static badRequest(message) { return new ApiError(400, message, 'VALIDATION_ERROR'); }
  static unauthorized(message = 'Authentication required') { return new ApiError(401, message, 'AUTHENTICATION_REQUIRED'); }
  static invalidCredentials(message = 'Invalid credentials') { return new ApiError(401, message, 'INVALID_CREDENTIALS'); }
  static forbidden(message = 'Access forbidden') { return new ApiError(403, message, 'FORBIDDEN'); }
  static notFound(message = 'Resource not found') { return new ApiError(404, message, 'NOT_FOUND'); }
  static conflict(message) { return new ApiError(409, message, 'CONFLICT'); }
  static resourceUnavailable(message) { return new ApiError(422, message, 'RESOURCE_UNAVAILABLE'); }
  static invalidTransition(message) { return new ApiError(422, message, 'INVALID_STATE_TRANSITION'); }
  static internal(message = 'Internal server error') { return new ApiError(500, message, 'INTERNAL_SERVER_ERROR'); }
}

module.exports = ApiError;
