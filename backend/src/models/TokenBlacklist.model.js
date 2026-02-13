const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['ADMIN', 'PARTNER']
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired tokens
  },
  blacklistedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
tokenBlacklistSchema.index({ token: 1 });
tokenBlacklistSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);




