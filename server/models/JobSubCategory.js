const mongoose = require('mongoose');

const jobSubCategorySchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCategory', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true }
}, { timestamps: true });

jobSubCategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('JobSubCategory', jobSubCategorySchema);


