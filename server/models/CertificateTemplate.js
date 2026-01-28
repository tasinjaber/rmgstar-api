const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Template type (for future extensibility)
  type: {
    type: String,
    enum: ['course', 'achievement', 'participation', 'custom'],
    default: 'course'
  },
  // Background image URL
  backgroundImage: {
    type: String,
    default: ''
  },
  // Background color (fallback if no image)
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  // Logo URL
  logoUrl: {
    type: String,
    default: ''
  },
  // Text colors
  textColors: {
    title: { type: String, default: '#1e40af' },
    name: { type: String, default: '#1e40af' },
    course: { type: String, default: '#1e40af' },
    date: { type: String, default: '#1e40af' },
    instructor: { type: String, default: '#1e40af' },
    verification: { type: String, default: '#6b7280' }
  },
  // Font settings
  fonts: {
    title: { family: String, size: String, weight: String },
    name: { family: String, size: String, weight: String },
    course: { family: String, size: String, weight: String },
    date: { family: String, size: String, weight: String },
    instructor: { family: String, size: String, weight: String }
  },
  // Layout positions (relative percentages)
  positions: {
    title: { x: Number, y: Number },
    studentName: { x: Number, y: Number },
    courseName: { x: Number, y: Number },
    date: { x: Number, y: Number },
    instructor: { x: Number, y: Number },
    verification: { x: Number, y: Number }
  },
  // Is default template
  isDefault: {
    type: Boolean,
    default: false
  },
  // Is active
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one default template
certificateTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('CertificateTemplate').updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);

