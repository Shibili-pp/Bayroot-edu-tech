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
    trim: true
    // Optional, stored encrypted
  },
  countryPreference: {
    type: String,
    required: true,
    trim: true
  },
  coursePreference: {
    type: String,
    required: true,
    trim: true
  },
  intake: {
    type: String,
    required: true,
    trim: true
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
    path: String,
    fileType: {
      type: String,
      enum: ['image', 'video', 'pdf']
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

