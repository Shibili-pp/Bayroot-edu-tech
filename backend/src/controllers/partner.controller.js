const Partner = require('../models/Partner.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { recordFailedAttempt, resetFailedAttempts } = require('../middlewares/accountLockout.middleware');
const { blacklistToken } = require('../middlewares/tokenBlacklist.middleware');
const { sendOTP, verifyOTP, isOTPVerified } = require('../utils/otp.util');
const { checkDuplicates } = require('../utils/duplicateCheck.util');

// Send OTP for Partner signup
const sendSignupOTP = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    // Check for duplicates in both Admin and Partner models
    const duplicates = await checkDuplicates(email, mobileNumber);

    // Check email duplicates
    if (duplicates.emailExists.exists) {
      const modelType = duplicates.emailExists.model === 'Admin' ? 'Admin' : 'Partner';
      return sendError(res, `An account with this email already exists as a ${modelType}. Please use a different email.`, 400);
    }

    // Check mobile number duplicates
    if (mobileNumber && duplicates.mobileExists.exists) {
      const modelType = duplicates.mobileExists.model === 'Admin' ? 'Admin' : 'Partner';
      return sendError(res, `An account with this mobile number already exists as a ${modelType}. Please use a different mobile number.`, 400);
    }

    // Send OTP
    await sendOTP(email, 'SIGNUP', 'Partner');

    return sendSuccess(res, null, 'OTP sent to your email. Please check your inbox.', 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

// Verify OTP and Register Partner
const register = async (req, res) => {
  try {
    const { companyName, email, mobileNumber, password, otp } = req.body;

    if (!otp) {
      return sendError(res, 'OTP is required', 400);
    }

    if (!mobileNumber) {
      return sendError(res, 'Mobile number is required', 400);
    }

    // Verify OTP
    const otpVerification = await verifyOTP(email, otp, 'SIGNUP');
    if (!otpVerification.success) {
      return sendError(res, otpVerification.message || 'Invalid or expired OTP', 400);
    }

    // Check for duplicates in both Admin and Partner models (double-check before registration)
    const duplicates = await checkDuplicates(email, mobileNumber);

    // Check email duplicates
    if (duplicates.emailExists.exists) {
      const modelType = duplicates.emailExists.model === 'Admin' ? 'Admin' : 'Partner';
      return sendError(res, `An account with this email already exists as a ${modelType}. Please use a different email.`, 400);
    }

    // Check mobile number duplicates
    if (duplicates.mobileExists.exists) {
      const modelType = duplicates.mobileExists.model === 'Admin' ? 'Admin' : 'Partner';
      return sendError(res, `An account with this mobile number already exists as a ${modelType}. Please use a different mobile number.`, 400);
    }

    const partner = new Partner({ companyName, email, mobileNumber, password });
    await partner.save();

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
        companyName: partner.companyName,
        isApproved: partner.isApproved
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
        companyName: partner.companyName,
        isApproved: partner.isApproved
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
        mobileNumber: partner.mobileNumber,
        role: partner.role,
        isActive: partner.isActive,
        isApproved: partner.isApproved
      }
    }, 'Profile retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Forgot Password - Send OTP
const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    const partner = await Partner.findOne({ email });
    if (!partner) {
      // Don't reveal if email exists (security best practice)
      return sendSuccess(res, null, 'If the email exists, an OTP has been sent.', 200);
    }

    if (!partner.isActive) {
      return sendError(res, 'Account is inactive. Please contact administrator.', 403);
    }

    // Send OTP
    await sendOTP(email, 'FORGOT_PASSWORD', 'Partner');

    return sendSuccess(res, null, 'OTP sent to your email. Please check your inbox.', 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

// Reset Password - Verify OTP and Reset
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return sendError(res, 'OTP and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Verify OTP
    const otpVerification = await verifyOTP(email, otp, 'FORGOT_PASSWORD');
    if (!otpVerification.success) {
      return sendError(res, otpVerification.message || 'Invalid or expired OTP', 400);
    }

    const partner = await Partner.findOne({ email });
    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    // Update password
    partner.password = newPassword;
    await partner.save();

    // Log audit
    await logAudit({
      userId: partner._id,
      userModel: 'Partner',
      role: partner.role,
      action: 'UPDATE_STUDENT', // Using existing action, could add RESET_PASSWORD
      metadata: { action: 'RESET_PASSWORD' },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Password reset successfully. Please login with your new password.', 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get all partners (Admin only)
const getAllPartners = async (req, res) => {
  try {
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can view all partners', 403);
    }

    const partners = await Partner.find()
      .select('companyName email mobileNumber createdAt isActive isApproved')
      .sort({ createdAt: -1 });

    // Log audit
    await logAudit({
      userId: req.user.userId || req.user.id,
      userModel: 'Admin',
      role,
      action: 'VIEW_PARTNERS',
      metadata: { count: partners.length },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { partners }, 'Partners retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Approve partner (Admin only)
const approvePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const userId = req.user.userId || req.user.id;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can approve partners', 403);
    }

    // Check MongoDB connection before attempting database operations
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Connection state:', mongoose.connection.readyState);
      return sendError(res, 'Database connection unavailable. Please ensure MongoDB is running.', 503);
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    // Check if already approved
    if (partner.isApproved) {
      return sendSuccess(res, { partner }, 'Partner is already approved');
    }

    partner.isApproved = true;
    await partner.save();

    // Log audit (wrap in try-catch to prevent audit failure from blocking the response)
    try {
      await logAudit({
        userId,
        userModel: 'Admin',
        role,
        action: 'UPDATE_PARTNER',
        targetId: partner._id,
        targetModel: 'Partner',
        metadata: { action: 'APPROVE_PARTNER', partnerEmail: partner.email },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      });
    } catch (auditError) {
      console.error('Audit logging error (non-blocking):', auditError);
      // Continue even if audit logging fails
    }

    return sendSuccess(res, { partner }, 'Partner approved successfully');
  } catch (error) {
    console.error('Approve partner error:', error);
    
    // Handle MongoDB-specific errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError' || error.name === 'MongooseError') {
      return sendError(res, 'Database connection error. Please ensure MongoDB is running and try again.', 503);
    }
    
    return sendError(res, error.message || 'Failed to approve partner', 500);
  }
};

// Reject/Unapprove partner (Admin only)
const rejectPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const userId = req.user.userId || req.user.id;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can reject partners', 403);
    }

    // Check MongoDB connection before attempting database operations
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Connection state:', mongoose.connection.readyState);
      return sendError(res, 'Database connection unavailable. Please ensure MongoDB is running.', 503);
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    // Check if already not approved
    if (!partner.isApproved) {
      return sendSuccess(res, { partner }, 'Partner is already not approved');
    }

    partner.isApproved = false;
    await partner.save();

    // Log audit (wrap in try-catch to prevent audit failure from blocking the response)
    try {
      await logAudit({
        userId,
        userModel: 'Admin',
        role,
        action: 'UPDATE_PARTNER',
        targetId: partner._id,
        targetModel: 'Partner',
        metadata: { action: 'REJECT_PARTNER', partnerEmail: partner.email },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      });
    } catch (auditError) {
      console.error('Audit logging error (non-blocking):', auditError);
      // Continue even if audit logging fails
    }

    return sendSuccess(res, { partner }, 'Partner approval revoked successfully');
  } catch (error) {
    console.error('Reject partner error:', error);
    
    // Handle MongoDB-specific errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError' || error.name === 'MongooseError') {
      return sendError(res, 'Database connection error. Please ensure MongoDB is running and try again.', 503);
    }
    
    return sendError(res, error.message || 'Failed to revoke partner approval', 500);
  }
};

// Check approval status (doesn't require approval to check)
const checkApprovalStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'PARTNER') {
      return sendError(res, 'Only partners can check approval status', 403);
    }

    const partner = await Partner.findById(userId).select('isApproved');
    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    return sendSuccess(res, { isApproved: partner.isApproved }, 'Approval status retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  sendSignupOTP,
  register,
  login,
  logout,
  getProfile,
  sendForgotPasswordOTP,
  resetPassword,
  getAllPartners,
  approvePartner,
  rejectPartner,
  checkApprovalStatus
};

