const TokenBlacklist = require('../models/TokenBlacklist.model');
const mongoose = require('mongoose');
const { sendError } = require('../utils/response.util');

/**
 * Check if MongoDB is connected
 */
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Check if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    // Check if MongoDB is connected before querying
    if (!isMongoConnected()) {
      console.warn('MongoDB not connected, skipping token blacklist check');
      return false; // Allow request if DB is not connected
    }
    
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    // Only log if it's not a connection error
    if (error.name !== 'MongoServerSelectionError' && error.name !== 'MongoNetworkError') {
      console.error('Token blacklist check error:', error);
    }
    return false; // Don't block on error
  }
};

/**
 * Blacklist a token
 */
const blacklistToken = async (token, userId, role, expiresAt) => {
  try {
    // Check if MongoDB is connected before attempting to blacklist
    if (!isMongoConnected()) {
      console.warn('MongoDB not connected, cannot blacklist token');
      return; // Silently fail if DB is not connected
    }
    
    await TokenBlacklist.create({
      token,
      userId,
      role,
      expiresAt
    });
  } catch (error) {
    // Ignore duplicate key errors (token already blacklisted)
    if (error.code !== 11000) {
      // Only log if it's not a connection error
      if (error.name !== 'MongoServerSelectionError' && error.name !== 'MongoNetworkError') {
        console.error('Token blacklist error:', error);
      }
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




