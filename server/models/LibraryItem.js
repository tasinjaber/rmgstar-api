const mongoose = require('mongoose');

const libraryItemSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
    enum: ['Book', 'Document', 'Guide', 'Report', 'Standard', 'Law/Rules/Orders', 'Other']
  },
  coverImage: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  format: {
    type: String,
    required: true,
    enum: ['pdf', 'link', 'video', 'other']
  },
  isMembersOnly: {
    type: Boolean,
    default: false
  },
  downloadUrl: {
    type: String,
    default: ''
  },
  externalUrl: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'RMG Platform'
  },
  publishDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

libraryItemSchema.index({ slug: 1 });
libraryItemSchema.index({ category: 1 });
libraryItemSchema.index({ isMembersOnly: 1 });

module.exports = mongoose.model('LibraryItem', libraryItemSchema);

