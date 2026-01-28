const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
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
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  completedLessons: [{
    lessonId: {
      type: String, // Can be CourseLesson._id or module.lesson index
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    watchTime: {
      type: Number, // in seconds
      default: 0
    }
  }],
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedAt: {
    type: Date
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
courseProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
courseProgressSchema.index({ enrollmentId: 1 });
courseProgressSchema.index({ completionPercentage: 1 });

// Method to calculate completion percentage
courseProgressSchema.methods.calculateCompletion = async function() {
  const Course = require('./Course');
  const CourseLesson = require('./CourseLesson');
  
  const course = await Course.findById(this.courseId);
  if (!course) return 0;
  
  // Try to get lessons from CourseLesson collection first
  let lessons = await CourseLesson.find({ courseId: this.courseId, isActive: true });
  
  // If no lessons in CourseLesson, use courseModules
  if (!lessons || lessons.length === 0) {
    if (course.courseModules && course.courseModules.length > 0) {
      lessons = course.courseModules.flatMap((module, moduleIndex) => 
        (module.lessons || []).map((lesson, lessonIndex) => ({
          _id: `temp-${moduleIndex}-${lessonIndex}`,
          ...lesson
        }))
      );
    }
  }
  
  if (!lessons || lessons.length === 0) return 0;
  
  const totalLessons = lessons.length;
  const completedCount = this.completedLessons.length;
  
  const percentage = Math.round((completedCount / totalLessons) * 100);
  this.completionPercentage = percentage;
  
  // Mark as completed if 100%
  if (percentage >= 100 && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  await this.save();
  return percentage;
};

module.exports = mongoose.model('CourseProgress', courseProgressSchema);

