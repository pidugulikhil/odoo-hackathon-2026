const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('FLEET_MANAGER', 'SAFETY_OFFICER')
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden(
      `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
    ));
  }
  next();
};

/**
 * Permission map — what each role can do.
 */
const PERMISSIONS = {
  FLEET_MANAGER: [
    'vehicle:read', 'vehicle:write', 'vehicle:retire',
    'maintenance:read', 'maintenance:write',
    'dashboard:read', 'analytics:read',
    'trip:read', 'trip:write', 'trip:dispatch',
  ],
  DRIVER: [
    'trip:read', 'trip:write', 'trip:dispatch',
    'vehicle:read', 'dashboard:read',
  ],
  SAFETY_OFFICER: [
    'driver:read', 'driver:write', 'driver:suspend',
    'analytics:read', 'dashboard:read',
    'vehicle:read', 'trip:read',
  ],
  FINANCIAL_ANALYST: [
    'fuel:read', 'fuel:write',
    'expense:read', 'expense:write',
    'analytics:read', 'dashboard:read',
    'vehicle:read', 'trip:read',
    'report:read',
  ],
};

/**
 * Check if a role has a specific permission.
 */
const hasPermission = (role, permission) => {
  return PERMISSIONS[role]?.includes(permission) ?? false;
};

/**
 * Middleware to check a specific permission.
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!hasPermission(req.user.role, permission)) {
    return next(ApiError.forbidden(`Permission denied: ${permission}`));
  }
  next();
};

module.exports = { requireRole, requirePermission, hasPermission, PERMISSIONS };
