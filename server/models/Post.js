const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
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
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: ['Industry News', 'Training Tips', 'Career Guide', 'Technology', 'Sustainability', 'Market Trends', 'Other']
  },
  tags: [{
    type: String
  }],
  content: {
    type: String,
    required: true // Markdown or HTML
  },
  excerpt: {
    type: String,
    default: ''
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

postSchema.index({ slug: 1 });
postSchema.index({ category: 1 });
postSchema.index({ status: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ authorId: 1 });

module.exports = mongoose.model('Post', postSchema);

