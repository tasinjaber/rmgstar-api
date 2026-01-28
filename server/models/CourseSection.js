const mongoose = require('mongoose');

const courseSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: '' // Optional category filter for the section
  },
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

courseSectionSchema.index({ order: 1 });
courseSectionSchema.index({ isActive: 1 });

module.exports = mongoose.model('CourseSection', courseSectionSchema);

