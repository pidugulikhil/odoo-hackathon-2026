const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const prisma = require('../prisma/client');

/**
 * Verifies JWT token from Authorization header.
 * Sets req.user = { id, name, email, role } on success.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('No token provided. Please log in.'));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Session expired. Please log in again.'));
      }
      return next(ApiError.unauthorized('Invalid token. Please log in.'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return next(ApiError.unauthorized('User no longer exists.'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
