const AuditLog = require('../models/AuditLog.model');

/**
 * Log an audit event
 * @param {Object} options - Audit log options
 * @param {string} options.userId - User ID
 * @param {string} options.userModel - User model name (Admin | Partner)
 * @param {string} options.role - User role (ADMIN | PARTNER)
 * @param {string} options.action - Action performed
 * @param {string} options.targetId - Target resource ID (optional)
 * @param {string} options.targetModel - Target model name (optional)
 * @param {Object} options.metadata - Additional metadata (optional)
 * @param {string} options.ipAddress - IP address (optional)
 * @param {string} options.userAgent - User agent (optional)
 */
const logAudit = async (options) => {
  try {
    const {
      userId,
      userModel,
      role,
      action,
      targetId,
      targetModel,
      metadata = {},
      ipAddress,
      userAgent
    } = options;

    await AuditLog.create({
      userId,
      userModel,
      role,
      action,
      targetId,
      targetModel,
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
  } catch (error) {
    // Don't throw error - audit logging should not break the main flow
    console.error('Audit logging error:', error);
  }
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
};

module.exports = {
  logAudit,
  getClientIp
};




