const mongoose = require('mongoose');

/**
 * File Schema
 * Stores file metadata and S3 URL (NOT the file itself)
 */
const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'pdf'],
  },
  mimeType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true,
  },
  s3Url: {
    type: String,
    required: true,
  },
  uploadedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'PARTNER'],
    },
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
fileSchema.index({ 'uploadedBy.userId': 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ createdAt: -1 });

/**
 * Static method to find file by fileId
 */
fileSchema.statics.findByFileId = function(fileId) {
  return this.findOne({ fileId, isDeleted: { $ne: true } });
};

/**
 * Instance method to soft delete file
 */
fileSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const File = mongoose.model('File', fileSchema);

module.exports = File;

