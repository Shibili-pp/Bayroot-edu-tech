const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * ARCHITECTURE IMPROVEMENT: Enhanced rate limiter with per-user limiting
 * 
 * Changes:
 * - Increased production limits (60 req/min general, 10 req/min auth)
 * - Per-user rate limiting for authenticated requests (uses userId from JWT)
 * - Falls back to IP-based limiting for unauthenticated requests
 * - Maintains backward compatibility
 */

/**
 * General rate limiter - 60 requests per minute (production)
 * ARCHITECTURE: Per-user limiting if authenticated, IP-based if not
 * More lenient in development: 200 requests per minute
 */
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 200 : 60, // ARCHITECTURE: Increased from 15 to 60 for production
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ARCHITECTURE: Use per-user key if authenticated, fallback to IP
  keyGenerator: (req) => {
    // If user is authenticated, use userId for per-user rate limiting
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    // Fallback to IP for unauthenticated requests
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  }
});

/**
 * Strict rate limiter for auth routes - 10 requests per minute (production)
 * ARCHITECTURE: Per-user limiting if authenticated, IP-based if not
 * More lenient in development: 50 requests per minute
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 50 : 10, // ARCHITECTURE: Increased from 5 to 10 for production
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ARCHITECTURE: Use per-user key if authenticated, fallback to IP
  keyGenerator: (req) => {
    // For auth routes, use email if available, otherwise IP
    if (req.body && req.body.email) {
      return `auth:${req.body.email}`;
    }
    return req.ip || req.connection.remoteAddress;
  }
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




