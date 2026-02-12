const { sendError } = require('../utils/response.util');

/**
 * Check if user has one of the allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized access.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

/**
 * Middleware to check if user is Admin
 */
const checkAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized access.', 401);
  }

  if (req.user.role !== 'ADMIN') {
    return sendError(res, 'Access denied. Admin access required.', 403);
  }

  next();
};

/**
 * Middleware to check if user is Partner
 */
const checkPartner = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized access.', 401);
  }

  if (req.user.role !== 'PARTNER') {
    return sendError(res, 'Access denied. Partner access required.', 403);
  }

  next();
};

module.exports = {
  authorize,
  checkAdmin,
  checkPartner
};

