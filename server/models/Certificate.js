const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  // Student/User who received the certificate
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Course for which certificate is issued
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  // Batch (if applicable)
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  // Certificate details
  studentName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  // Unique verification number
  verificationNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Certificate category/type
  category: {
    type: String,
    default: 'Course Completion'
  },
  // Certificate template settings
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CertificateTemplate'
  },
  // Issuer information
  issuerName: {
    type: String,
    default: ''
  },
  issuerTitle: {
    type: String,
    default: ''
  },
  // Certificate status
  status: {
    type: String,
    enum: ['active', 'revoked', 'pending'],
    default: 'active'
  },
  // Manual creation flag
  isManual: {
    type: Boolean,
    default: false
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
certificateSchema.index({ studentId: 1 });
certificateSchema.index({ courseId: 1 });
certificateSchema.index({ verificationNumber: 1 });
certificateSchema.index({ status: 1 });

// Generate verification number before saving
certificateSchema.pre('save', async function(next) {
  if (!this.verificationNumber) {
    // Generate unique verification number: CERT-YYYYMMDD-XXXXXX
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const verificationNumber = `CERT-${dateStr}-${random}`;
      
      // Check if this verification number already exists
      const existing = await mongoose.model('Certificate').findOne({ verificationNumber });
      if (!existing) {
        this.verificationNumber = verificationNumber;
        isUnique = true;
      }
      attempts++;
    }
    
    // Fallback if still not unique
    if (!this.verificationNumber) {
      const date = new Date();
      const timestamp = date.getTime();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.verificationNumber = `CERT-${timestamp}-${random}`;
    }
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);

