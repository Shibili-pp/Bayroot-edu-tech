const TokenBlacklist = require('../models/TokenBlacklist.model');
const { sendError } = require('../utils/response.util');

/**
 * Check if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    console.error('Token blacklist check error:', error);
    return false; // Don't block on error
  }
};

/**
 * Blacklist a token
 */
const blacklistToken = async (token, userId, role, expiresAt) => {
  try {
    await TokenBlacklist.create({
      token,
      userId,
      role,
      expiresAt
    });
  } catch (error) {
    // Ignore duplicate key errors (token already blacklisted)
    if (error.code !== 11000) {
      console.error('Token blacklist error:', error);
    }
  }
};

/**
 * Middleware to check token blacklist
 */
const checkTokenBlacklist = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Let auth middleware handle missing token
    }

    const isBlacklisted = await isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      return sendError(res, 'Token has been revoked. Please login again.', 401);
    }

    next();
  } catch (error) {
    console.error('Token blacklist middleware error:', error);
    next(); // Don't block on error
  }
};

module.exports = {
  isTokenBlacklisted,
  blacklistToken,
  checkTokenBlacklist
};




