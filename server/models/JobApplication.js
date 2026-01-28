const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow non-authenticated applications
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  cvUrl: {
    type: String,
    default: ''
  },
  coverLetter: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'submitted'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

jobApplicationSchema.index({ jobId: 1 });
jobApplicationSchema.index({ applicantId: 1 });
jobApplicationSchema.index({ email: 1 });
jobApplicationSchema.index({ status: 1 });
// Prevent duplicate applications - by applicantId if authenticated, or by email if not
// Note: This is handled in the route logic since we can't have conditional unique indexes

module.exports = mongoose.model('JobApplication', jobApplicationSchema);

