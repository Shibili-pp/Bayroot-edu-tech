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
    required: true,
    trim: true
    // Stored encrypted
  },
  passportNumber: {
    type: String,
    trim: true,
    default: null
    // Optional, stored encrypted
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
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  documents: [{
    fileId: {
      type: String,
      required: true,
      unique: true
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
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
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

