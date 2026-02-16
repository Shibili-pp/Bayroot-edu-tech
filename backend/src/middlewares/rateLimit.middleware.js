const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * General rate limiter - 15 requests per minute per IP (production)
 * More lenient in development: 100 requests per minute
 */
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 100 : 15, // More lenient in development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  }
});

/**
 * Strict rate limiter for auth routes - 5 requests per minute (production)
 * More lenient in development: 20 requests per minute
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 20 : 5, // More lenient in development
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File download rate limiter - 30 requests per minute (production)
 * More lenient in development: 200 requests per minute
 */
const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 200 : 30, // More lenient in development
  message: {
    success: false,
    message: 'Too many download requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  downloadRateLimiter
};




