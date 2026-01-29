const mongoose = require('mongoose');

const libraryPurchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryItem',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  paymentMethod: {
    type: String,
    enum: ['pay_later', 'manual', 'bkash', 'nagad', 'rocket', 'sslcommerz', 'other'],
    default: 'manual'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Prevent duplicate purchases per user+item (keep latest status/txn in same doc)
libraryPurchaseSchema.index({ userId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('LibraryPurchase', libraryPurchaseSchema);


