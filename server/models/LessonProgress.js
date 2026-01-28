const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseLesson',
    required: true
  },
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  watchedDuration: {
    type: Number, // in seconds
    default: 0
  },
  totalDuration: {
    type: Number, // in seconds
    default: 0
  },
  completedAt: {
    type: Date
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Prevent duplicate progress entries
lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ studentId: 1, courseId: 1 });
lessonProgressSchema.index({ enrollmentId: 1 });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);

