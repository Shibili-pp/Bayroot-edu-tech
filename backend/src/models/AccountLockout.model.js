const mongoose = require('mongoose');

const accountLockoutSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['Admin', 'Partner']
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
accountLockoutSchema.index({ email: 1, userType: 1 });
accountLockoutSchema.index({ lockedUntil: 1 });

// Clean up expired locks automatically
accountLockoutSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AccountLockout', accountLockoutSchema);

