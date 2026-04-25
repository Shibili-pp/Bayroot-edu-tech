const mongoose = require('mongoose');
const { encrypt } = require('../utils/encryption.util');

// Helper to check if string is already encrypted (contains ':')
const isEncrypted = (str) => {
  return str && typeof str === 'string' && str.includes(':') && str.split(':').length === 2;
};

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
    // Stored encrypted
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    default: ''
    // Stored encrypted
  },
  passportNumber: {
    type: String,
    trim: true,
    default: null
    // Optional, stored encrypted
  },
  nationality: {
    type: String,
    trim: true,
    default: null
  },
  aadharNumber: {
    type: String,
    required: true,
    trim: true
    // Required, stored encrypted
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: true
  },
  intakeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intake',
    required: false
  },
  intakeYear: {
    type: String,
    trim: true,
    required: false
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  status: {
    type: String,
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
      'Student Dropped',
      'Rejected by Bayroot Admin'
    ],
    default: 'Under Review',
    trim: true
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now
  },
  documents: [{
    fileId: {
      type: String,
      required: true
    },
    filename: String,
    originalName: String,
    path: String, // Deprecated: kept for backward compatibility
    s3Key: String, // S3 object key
    s3Url: String, // Full S3 URL
    fileType: {
      type: String,
      enum: ['image', 'video', 'pdf']
    },
    url: {
      type: String // S3 URL (for backward compatibility, same as s3Url)
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  offerLetter: {
    fileId: {
      type: String,
      default: null
    },
    filename: String,
    originalName: String,
    s3Key: String,
    s3Url: String,
    fileType: {
      type: String,
      enum: ['pdf', 'image'],
      default: 'pdf'
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: null
    },
    uploadedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'uploadedBy.userModel'
      },
      userModel: {
        type: String,
        enum: ['Admin', 'Partner']
      }
    }
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  rejectedByAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt sensitive fields before saving
studentSchema.pre('save', function(next) {
  if (this.isModified('email') && this.email && !isEncrypted(this.email)) {
    this.email = encrypt(this.email);
  }
  if (this.isModified('phone') && this.phone && !isEncrypted(this.phone)) {
    this.phone = encrypt(this.phone);
  }
  if (this.isModified('passportNumber') && this.passportNumber && !isEncrypted(this.passportNumber)) {
    this.passportNumber = encrypt(this.passportNumber);
  }
  if (this.isModified('aadharNumber') && this.aadharNumber && !isEncrypted(this.aadharNumber)) {
    this.aadharNumber = encrypt(this.aadharNumber);
  }
  next();
});

// Encrypt on update
studentSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate();
  if (update.$set) {
    if (update.$set.email && !isEncrypted(update.$set.email)) {
      update.$set.email = encrypt(update.$set.email);
    }
    if (update.$set.phone && !isEncrypted(update.$set.phone)) {
      update.$set.phone = encrypt(update.$set.phone);
    }
    if (update.$set.passportNumber && !isEncrypted(update.$set.passportNumber)) {
      update.$set.passportNumber = encrypt(update.$set.passportNumber);
    }
    if (update.$set.aadharNumber && !isEncrypted(update.$set.aadharNumber)) {
      update.$set.aadharNumber = encrypt(update.$set.aadharNumber);
    }
  } else {
    if (update.email && !isEncrypted(update.email)) {
      update.email = encrypt(update.email);
    }
    if (update.phone && !isEncrypted(update.phone)) {
      update.phone = encrypt(update.phone);
    }
    if (update.passportNumber && !isEncrypted(update.passportNumber)) {
      update.passportNumber = encrypt(update.passportNumber);
    }
    if (update.aadharNumber && !isEncrypted(update.aadharNumber)) {
      update.aadharNumber = encrypt(update.aadharNumber);
    }
  }
  next();
});

// Query helper to exclude deleted records by default
studentSchema.query.notDeleted = function() {
  return this.where({ isDeleted: false });
};

// Static method to find non-deleted records
studentSchema.statics.findNotDeleted = function(conditions = {}) {
  return this.find({ ...conditions, isDeleted: false });
};

module.exports = mongoose.model('Student', studentSchema);

