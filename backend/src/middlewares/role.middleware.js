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

/**
 * Middleware to check if partner is approved
 */
const checkPartnerApproved = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'PARTNER') {
      return sendError(res, 'Unauthorized access.', 401);
    }

    const Partner = require('../models/Partner.model');
    const partner = await Partner.findById(req.user.userId || req.user.id);
    
    if (!partner) {
      return sendError(res, 'Partner not found.', 404);
    }

    if (!partner.isApproved) {
      return sendError(res, 'Your account is pending approval from the administrator. Please wait for approval.', 403);
    }

    next();
  } catch (error) {
    return sendError(res, error.message || 'Error checking partner approval status', 500);
  }
};

module.exports = {
  authorize,
  checkAdmin,
  checkPartner,
  checkPartnerApproved
};

