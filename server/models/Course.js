const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Merchandising', 'Quality Control', 'Production', 'Design', 'Marketing', 'Management', 'Technical', 'Other']
  },
  level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  language: {
    type: String,
    default: 'English',
    enum: ['English', 'Bangla', 'Both']
  },
  mode: {
    type: String,
    required: true,
    enum: ['online', 'offline', 'hybrid']
  },
  durationText: {
    type: String,
    required: true // e.g., "2 Months", "40 Hours"
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    default: null
  },
  batchNumber: {
    type: String,
    default: '1'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  thumbnailImage: {
    type: String,
    default: ''
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Additional Instructors (for multiple instructors)
  additionalInstructors: [{
    name: String,
    title: String,
    avatar: String,
    rating: Number,
    studentsCount: Number
  }],
  // Course Structure
  courseStructure: {
    videoLectures: { type: Number, default: 0 },
    hoursOfContent: { type: Number, default: 0 },
    assignments: { type: Number, default: 0 },
    pageGuide: { type: Number, default: 0 },
    modules: [{
      title: String,
      videos: Number,
      hours: Number,
      color: String // for border color
    }]
  },
  // Learning Outcomes
  learningOutcomes: [String],
  // Course Details - Modules with Lessons
  courseModules: [{
    title: String,
    lessons: [{
      type: { type: String, enum: ['video', 'text', 'quiz'] },
      title: String,
      videoUrl: String,
      videoDuration: Number,
      content: String,
      isFreePreview: { type: Boolean, default: false },
      resources: [{
        title: String,
        url: String,
        type: String
      }]
    }]
  }],
  // What's Included
  whatsIncluded: [{
    title: String,
    description: String,
    icon: String,
    color: String
  }],
  // Bonus Materials
  bonusMaterials: [String],
  // Requirements
  requirements: [{
    title: String,
    description: String
  }],
  // FAQ
  faq: [{
    question: String,
    answer: String
  }],
  // Statistics
  stats: {
    totalStudents: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    successStories: { type: Number, default: 0 }
  },
  // Video Thumbnails for carousel
  videoThumbnails: [String],
  // Syllabus Download URL
  syllabusUrl: String,
  // Certificate Template Info
  certificateInfo: {
    issuerName: String,
    issuerTitle: String
  }
}, {
  timestamps: true
});

courseSchema.index({ slug: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('Course', courseSchema);

