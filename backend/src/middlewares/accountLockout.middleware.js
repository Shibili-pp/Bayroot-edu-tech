const AccountLockout = require('../models/AccountLockout.model');
const { sendError } = require('../utils/response.util');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Check if account is locked
 */
const checkAccountLockout = async (email, userType) => {
  const lockout = await AccountLockout.findOne({ email, userType });
  
  if (!lockout) {
    return { isLocked: false };
  }

  // Check if lockout has expired
  if (lockout.lockedUntil && lockout.lockedUntil > new Date()) {
    const minutesRemaining = Math.ceil((lockout.lockedUntil - new Date()) / (1000 * 60));
    return {
      isLocked: true,
      minutesRemaining,
      message: `Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`
    };
  }

  // Lockout expired, reset
  if (lockout.lockedUntil && lockout.lockedUntil <= new Date()) {
    await AccountLockout.deleteOne({ _id: lockout._id });
    return { isLocked: false };
  }

  return { isLocked: false };
};

/**
 * Record failed login attempt
 */
const recordFailedAttempt = async (email, userType) => {
  let lockout = await AccountLockout.findOne({ email, userType });

  if (!lockout) {
    lockout = new AccountLockout({ email, userType, failedAttempts: 0 });
  }

  lockout.failedAttempts += 1;
  lockout.lastAttemptAt = new Date();

  // Lock account after max failed attempts
  if (lockout.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockout.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }

  await lockout.save();
  return lockout.failedAttempts;
};

/**
 * Reset failed attempts on successful login
 */
const resetFailedAttempts = async (email, userType) => {
  await AccountLockout.deleteOne({ email, userType });
};

/**
 * Middleware to check account lockout before login
 */
const verifyAccountNotLocked = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userType = req.path.includes('/admin/') ? 'Admin' : 'Partner';

    if (!email) {
      return next(); // Let validation handle missing email
    }

    const lockStatus = await checkAccountLockout(email, userType);
    
    if (lockStatus.isLocked) {
      return sendError(res, lockStatus.message, 423); // 423 Locked
    }

    next();
  } catch (error) {
    console.error('Account lockout check error:', error);
    next(); // Don't block on error, let login proceed
  }
};

module.exports = {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  verifyAccountNotLocked
};

