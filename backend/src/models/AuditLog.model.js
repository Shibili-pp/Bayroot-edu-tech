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
      'UPLOAD_FILE',
      'DOWNLOAD_FILE',
      'DELETE_FILE',
      'CREATE_ANNOUNCEMENT',
      'UPDATE_ANNOUNCEMENT',
      'DELETE_ANNOUNCEMENT',
      'CREATE_UNIVERSITY',
      'UPDATE_UNIVERSITY',
      'DELETE_UNIVERSITY',
      'CREATE_COUNTRY',
      'UPDATE_COUNTRY',
      'DELETE_COUNTRY',
      'CREATE_COURSE',
      'UPDATE_COURSE',
      'DELETE_COURSE',
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
    enum: ['Student', 'File', 'Announcement', 'University', 'Country', 'Course']
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




