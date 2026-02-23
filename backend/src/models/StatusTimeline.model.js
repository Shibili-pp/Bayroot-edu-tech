const mongoose = require('mongoose');

/**
 * Status Timeline Schema
 * Defines minimum time (in hours) required before a status can be changed to another status
 */
const statusTimelineSchema = new mongoose.Schema({
  fromStatus: {
    type: String,
    required: true,
    enum: [
      'Under Review',
      'Offer Requested',
      'Offer Received',
      'Application payment 1 received',
      'Application Moved',
      'Ministry Submitted',
      'Exam issued',
      'Application payment 2 received',
      'Fee Paid',
      'Visa Documents Issued',
      'Visa Submitted',
      'Visa Received',
      'Full fee',
      'Application payment 3 received',
      'Visa rejected',
      'Trc request',
      'Trc approved',
      'Trc rejected',
      'Student Dropped'
    ],
    trim: true
  },
  toStatus: {
    type: String,
    required: true,
    enum: [
      'Under Review',
      'Offer Requested',
      'Offer Received',
      'Application payment 1 received',
      'Application Moved',
      'Ministry Submitted',
      'Exam issued',
      'Application payment 2 received',
      'Fee Paid',
      'Visa Documents Issued',
      'Visa Submitted',
      'Visa Received',
      'Full fee',
      'Application payment 3 received',
      'Visa rejected',
      'Trc request',
      'Trc approved',
      'Trc rejected',
      'Student Dropped'
    ],
    trim: true
  },
  minHours: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  timeUnit: {
    type: String,
    enum: ['minutes', 'hours', 'days'],
    default: 'hours',
    required: true
  },
  timeValue: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Ensure unique combination of fromStatus and toStatus
statusTimelineSchema.index({ fromStatus: 1, toStatus: 1 }, { unique: true });

module.exports = mongoose.model('StatusTimeline', statusTimelineSchema);


