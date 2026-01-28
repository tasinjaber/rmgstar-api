const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Garments', 'Retail Brands', 'Buying House', 'Merchandising', 'Textile', 'Washing', 'Quality Control', 'Production', 'Design', 'Other']
  },
  type: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship']
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    required: true
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'BDT'
    }
  },
  experience: {
    min: Number, // years
    max: Number
  },
  deadline: {
    type: Date,
    required: true
  },
  applyType: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  externalUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

jobPostSchema.index({ employerId: 1 });
jobPostSchema.index({ category: 1 });
jobPostSchema.index({ isActive: 1 });
jobPostSchema.index({ deadline: 1 });

module.exports = mongoose.model('JobPost', jobPostSchema);

