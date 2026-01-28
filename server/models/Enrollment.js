const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['pay_later', 'sslcommerz', 'bkash'],
    default: ''
  },
  transactionId: {
    type: String,
    default: ''
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

enrollmentSchema.index({ studentId: 1 });
enrollmentSchema.index({ batchId: 1 });
enrollmentSchema.index({ paymentStatus: 1 });
// Prevent duplicate enrollments
enrollmentSchema.index({ studentId: 1, batchId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

