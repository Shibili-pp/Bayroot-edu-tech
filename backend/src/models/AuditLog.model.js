const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
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
  role: {
    type: String,
    required: true,
    enum: ['ADMIN', 'PARTNER']
  },
  action: {
    type: String,
    required: true,
    enum: [
      'VIEW_STUDENT',
      'CREATE_STUDENT',
      'UPDATE_STUDENT',
      'DELETE_STUDENT',
      'UPLOAD_DOCUMENT',
      'DOWNLOAD_FILE',
      'LOGIN',
      'LOGOUT'
    ]
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['Student', 'File']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);




