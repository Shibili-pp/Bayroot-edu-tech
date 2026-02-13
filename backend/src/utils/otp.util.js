const OTP = require('../models/OTP.model');
const { sendOTPEmail } = require('./email.util');

/**
 * Generate a random 4-digit OTP
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP to email
 * @param {string} email - Email address
 * @param {string} type - OTP type (SIGNUP or FORGOT_PASSWORD)
 * @param {string} userType - User type (Admin or Partner)
 */
const sendOTP = async (email, type, userType) => {
  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Set expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type });

    // Save new OTP
    const otpRecord = new OTP({
      email,
      otp,
      type,
      userType,
      expiresAt
    });
    await otpRecord.save();

    // Send email
    await sendOTPEmail(email, otp, type);

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Send OTP error:', error);
    throw new Error('Failed to send OTP');
  }
};

/**
 * Verify OTP
 * @param {string} email - Email address
 * @param {string} otp - OTP code
 * @param {string} type - OTP type (SIGNUP or FORGOT_PASSWORD)
 */
const verifyOTP = async (email, otp, type) => {
  try {
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return { success: false, message: 'Failed to verify OTP' };
  }
};

/**
 * Check if OTP is verified for email
 * @param {string} email - Email address
 * @param {string} type - OTP type
 */
const isOTPVerified = async (email, type) => {
  try {
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      type,
      verified: true,
      expiresAt: { $gt: new Date() }
    });

    return !!otpRecord;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  isOTPVerified
};

