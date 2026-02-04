const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional since we removed it from form
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCompany',
    default: null
  },
  companyEmail: {
    type: String,
    default: '',
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCategory',
    default: null
  },
  subCategory: {
    type: String,
    default: '',
    trim: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSubCategory',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Full Time', 'Part Time', 'Contractual', 'Freelance']
  },
  employmentStatus: {
    type: String,
    enum: ['Full Time', 'Part Time', 'Contractual', 'Internship', 'Freelance']
  },
  workplace: [{
    type: String,
    enum: ['Work From Office', 'Work From Home']
  }],
  vacancy: Number,
  locations: [String],
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    required: true
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'BDT'
    }
  },
  experience: {
    min: Number, // years
    max: Number
  },
  deadline: {
    type: Date,
    required: true
  },
  applyType: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  externalUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Step 1 additional fields
  showSalary: {
    type: Boolean,
    default: false
  },
  compensations: [String],
  lunchFacility: {
    type: String,
    enum: ['Partially subsidize', 'Full Subsidize']
  },
  salaryReview: {
    type: String,
    enum: ['Half Yearly', 'Yearly']
  },
  festivalBonus: Number,
  otherBenefits: String,
  // Step 2 fields
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Both', 'Only Male', 'Only Female']
  },
  ageMin: Number,
  ageMax: Number,
  preferVideoResume: {
    type: Boolean,
    default: false
  },
  degrees: [{
    degree: String,
    level: String,
    major: String
  }],
  preferredInstitutions: [String],
  certifications: [String],
  experienceRequired: {
    type: Boolean,
    default: false
  },
  skills: [String],
  additionalRequirements: [String],
  // Step 3 fields
  matchingCriteria: {
    experience: { type: Boolean, default: false },
    location: { type: Boolean, default: false },
    industryExperience: { type: Boolean, default: false },
    education: { type: Boolean, default: false },
    skills: { type: Boolean, default: false },
    salary: { type: Boolean, default: false }
  },
  ageRestriction: {
    type: Boolean,
    default: false
  },
  genderRestriction: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

jobPostSchema.index({ employerId: 1 });
jobPostSchema.index({ category: 1 });
jobPostSchema.index({ isActive: 1 });
jobPostSchema.index({ deadline: 1 });

module.exports = mongoose.model('JobPost', jobPostSchema);

