const Partner = require('../models/Partner.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { recordFailedAttempt, resetFailedAttempts } = require('../middlewares/accountLockout.middleware');
const { blacklistToken } = require('../middlewares/tokenBlacklist.middleware');

// Register Partner
const register = async (req, res) => {
  try {
    const { companyName, email, password } = req.body;

    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return sendError(res, 'Partner with this email already exists', 400);
    }

    const partner = new Partner({ companyName, email, password });
    await partner.save();

    const token = jwt.sign(
      { userId: partner._id.toString(), role: partner.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: partner._id.toString(),
        role: partner.role,
        companyName: partner.companyName
      }
    }, 'Partner registered successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Login Partner
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const partner = await Partner.findOne({ email });
    if (!partner) {
      // Record failed attempt even if user doesn't exist (prevent enumeration)
      await recordFailedAttempt(email, 'Partner');
      return sendError(res, 'Invalid email or password', 401);
    }

    if (!partner.isActive) {
      return sendError(res, 'Account is inactive. Please contact administrator.', 403);
    }

    const isPasswordValid = await partner.comparePassword(password);
    if (!isPasswordValid) {
      // Record failed attempt
      await recordFailedAttempt(email, 'Partner');
      return sendError(res, 'Invalid email or password', 401);
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email, 'Partner');

    const token = jwt.sign(
      { userId: partner._id.toString(), role: partner.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit
    await logAudit({
      userId: partner._id,
      userModel: 'Partner',
      role: partner.role,
      action: 'LOGIN',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, {
      token,
      user: {
        id: partner._id.toString(),
        role: partner.role,
        companyName: partner.companyName
      }
    }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Logout Partner
const logout = async (req, res) => {
  try {
    const token = req.user.token || req.header('Authorization')?.replace('Bearer ', '');
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (token) {
      // Decode token to get expiry
      const decoded = jwt.decode(token);
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Blacklist token
      await blacklistToken(token, userId, role, expiresAt);
    }

    // Log audit
    await logAudit({
      userId,
      userModel: 'Partner',
      role,
      action: 'LOGOUT',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get current partner profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await Partner.findById(userId).select('-password');
    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    return sendSuccess(res, { 
      user: {
        id: partner._id.toString(),
        companyName: partner.companyName,
        email: partner.email,
        role: partner.role,
        isActive: partner.isActive
      }
    }, 'Profile retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile
};

