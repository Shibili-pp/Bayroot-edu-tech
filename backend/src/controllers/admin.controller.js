const Admin = require('../models/Admin.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { recordFailedAttempt, resetFailedAttempts } = require('../middlewares/accountLockout.middleware');
const { blacklistToken } = require('../middlewares/tokenBlacklist.middleware');
const { sendOTP, verifyOTP, isOTPVerified } = require('../utils/otp.util');

// Send OTP for Admin signup
const sendSignupOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendError(res, 'Admin with this email already exists', 400);
    }

    // Send OTP
    await sendOTP(email, 'SIGNUP', 'Admin');

    return sendSuccess(res, null, 'OTP sent to your email. Please check your inbox.', 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

// Verify OTP and Register Admin
const register = async (req, res) => {
  try {
    const { name, email, mobileNumber, password, otp } = req.body;

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

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendError(res, 'Admin with this email already exists', 400);
    }

    const admin = new Admin({ name, email, mobileNumber, password });
    await admin.save();

    const token = jwt.sign(
      { userId: admin._id.toString(), role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit
    await logAudit({
      userId: admin._id,
      userModel: 'Admin',
      role: admin.role,
      action: 'LOGIN',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, {
      token,
      user: {
        id: admin._id.toString(),
        role: admin.role
      }
    }, 'Admin registered successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Login Admin
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Record failed attempt even if user doesn't exist (prevent enumeration)
      await recordFailedAttempt(email, 'Admin');
      return sendError(res, 'Invalid email or password', 401);
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      // Record failed attempt
      await recordFailedAttempt(email, 'Admin');
      return sendError(res, 'Invalid email or password', 401);
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email, 'Admin');

    const token = jwt.sign(
      { userId: admin._id.toString(), role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit
    await logAudit({
      userId: admin._id,
      userModel: 'Admin',
      role: admin.role,
      action: 'LOGIN',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, {
      token,
      user: {
        id: admin._id.toString(),
        role: admin.role
      }
    }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Logout Admin
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
      userModel: 'Admin',
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

// Get current admin profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const admin = await Admin.findById(userId).select('-password');
    if (!admin) {
      return sendError(res, 'Admin not found', 404);
    }

    return sendSuccess(res, { 
      user: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role
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

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Don't reveal if email exists (security best practice)
      return sendSuccess(res, null, 'If the email exists, an OTP has been sent.', 200);
    }

    // Send OTP
    await sendOTP(email, 'FORGOT_PASSWORD', 'Admin');

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

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return sendError(res, 'Admin not found', 404);
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Log audit
    await logAudit({
      userId: admin._id,
      userModel: 'Admin',
      role: admin.role,
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

module.exports = {
  sendSignupOTP,
  register,
  login,
  logout,
  getProfile,
  sendForgotPasswordOTP,
  resetPassword
};

