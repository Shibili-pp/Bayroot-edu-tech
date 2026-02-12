const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { isTokenBlacklisted } = require('./tokenBlacklist.middleware');

/**
 * Verify JWT token and attach user to request
 * Also checks if token is blacklisted
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Ensure userId exists (for backward compatibility, check both id and userId)
    req.user = {
      userId: decoded.userId || decoded.id,
      role: decoded.role,
      token // Attach token for potential blacklisting
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// Alias for backward compatibility
const authenticate = verifyToken;

module.exports = verifyToken;
module.exports.authenticate = authenticate;

