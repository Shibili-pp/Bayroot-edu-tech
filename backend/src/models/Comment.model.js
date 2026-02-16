const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'authorModel'
  },
  authorModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Partner']
  },
  role: {
    type: String,
    required: true,
    enum: ['ADMIN', 'PARTNER']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  documents: [{
    fileId: {
      type: String,
      required: true
    },
    filename: String,
    originalName: String,
    s3Key: String,
    s3Url: String,
    fileType: {
      type: String,
      enum: ['image', 'video', 'pdf']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
commentSchema.index({ studentId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

module.exports = mongoose.model('Comment', commentSchema);

