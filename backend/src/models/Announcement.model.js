const mongoose = require('mongoose');

/**
 * Announcement Schema
 * Stores announcements created by admins for partners
 */
const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['reminder', 'urgent', 'critical'],
    default: 'reminder'
  },
  // Partner IDs that should NOT see this announcement (hidden from)
  hiddenFromPartners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  }],
  // Admin who created the announcement
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null // null means never expires
  }
}, {
  timestamps: true
});

// Indexes for better query performance
announcementSchema.index({ category: 1 });
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ expiresAt: 1 });

/**
 * Static method to get visible announcements for a partner
 */
announcementSchema.statics.getVisibleForPartner = function(partnerId) {
  const mongoose = require('mongoose');
  // Convert partnerId to ObjectId if it's a string
  const partnerObjectId = mongoose.Types.ObjectId.isValid(partnerId) 
    ? new mongoose.Types.ObjectId(partnerId) 
    : partnerId;
  
  return this.find({
    isActive: true,
    hiddenFromPartners: { $nin: [partnerObjectId] },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;

