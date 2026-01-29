const mongoose = require('mongoose');

const jobCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, unique: true, lowercase: true }
}, { timestamps: true });

jobCategorySchema.index({ slug: 1 });

module.exports = mongoose.model('JobCategory', jobCategorySchema);


