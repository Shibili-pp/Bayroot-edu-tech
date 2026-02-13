const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['SIGNUP', 'FORGOT_PASSWORD']
  },
  userType: {
    type: String,
    required: true,
    enum: ['Admin', 'Partner']
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ email: 1, otp: 1 });

module.exports = mongoose.model('OTP', otpSchema);

