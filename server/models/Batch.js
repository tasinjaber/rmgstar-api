const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  weekWiseTimes: {
    type: Map,
    of: {
      startTime: String,
      endTime: String
    },
    default: {}
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  daysOfWeek: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  startTime: {
    type: String,
    required: true // e.g., "10:00 AM"
  },
  endTime: {
    type: String,
    required: true // e.g., "12:00 PM"
  },
  mode: {
    type: String,
    required: true,
    enum: ['online', 'offline', 'hybrid']
  },
  seatLimit: {
    type: Number,
    required: true,
    min: 1
  },
  enrolledCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'running', 'completed'],
    default: 'upcoming'
  },
  meetingLink: {
    type: String,
    default: '' // For online/hybrid batches
  },
  venue: {
    type: String,
    default: '' // For offline/hybrid batches
  }
}, {
  timestamps: true
});

batchSchema.index({ startDate: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ batchNumber: 1 });

module.exports = mongoose.model('Batch', batchSchema);

