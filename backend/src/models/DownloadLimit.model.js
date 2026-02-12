const mongoose = require('mongoose');

const downloadLimitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Partner']
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for faster lookups
downloadLimitSchema.index({ userId: 1, date: 1 }, { unique: true });

// Auto-cleanup old records (older than 7 days)
downloadLimitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('DownloadLimit', downloadLimitSchema);

