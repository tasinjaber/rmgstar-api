const mongoose = require('mongoose');

const courseLessonSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  moduleTitle: {
    type: String,
    required: true,
    trim: true
  },
  moduleOrder: {
    type: Number,
    default: 0
  },
  lessonTitle: {
    type: String,
    required: true,
    trim: true
  },
  lessonOrder: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['video', 'text', 'quiz', 'assignment'],
    required: true,
    default: 'video'
  },
  videoUrl: {
    type: String,
    default: ''
  },
  videoDuration: {
    type: Number, // in seconds
    default: 0
  },
  content: {
    type: String, // For text/quiz content
    default: ''
  },
  isFreePreview: {
    type: Boolean,
    default: false
  },
  resources: [{
    title: String,
    url: String,
    type: String // 'file', 'link', 'document'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

courseLessonSchema.index({ courseId: 1, moduleOrder: 1, lessonOrder: 1 });
courseLessonSchema.index({ courseId: 1, isActive: 1 });

module.exports = mongoose.model('CourseLesson', courseLessonSchema);

