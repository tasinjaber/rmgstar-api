const mongoose = require('mongoose');

const employerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

employerSchema.index({ userId: 1 });

module.exports = mongoose.model('Employer', employerSchema);

