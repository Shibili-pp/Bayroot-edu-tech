const mongoose = require('mongoose');

const intakeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique intake name per country
intakeSchema.index({ name: 1, countryId: 1 }, { unique: true });

module.exports = mongoose.model('Intake', intakeSchema);


