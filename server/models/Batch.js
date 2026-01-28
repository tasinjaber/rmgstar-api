const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

batchSchema.index({ courseId: 1 });
batchSchema.index({ trainerId: 1 });
batchSchema.index({ startDate: 1 });
batchSchema.index({ status: 1 });

module.exports = mongoose.model('Batch', batchSchema);

