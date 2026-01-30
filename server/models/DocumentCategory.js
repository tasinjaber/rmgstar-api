const mongoose = require('mongoose');

const documentCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    default: ''
  },
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

documentCategorySchema.index({ slug: 1 });
documentCategorySchema.index({ name: 1 });
documentCategorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('DocumentCategory', documentCategorySchema);

