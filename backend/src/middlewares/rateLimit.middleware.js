const rateLimit = require('express-rate-limit');

/**
 * General rate limiter - 15 requests per minute per IP
 */
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per window
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
 * Strict rate limiter for auth routes - 5 requests per minute
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window (stricter for login)
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File download rate limiter - 30 requests per minute
 */
const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
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




