const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General', index: true },
  author: { type: String, default: 'RMG Platform' },

  fileUrl: { type: String, required: true },
  fileName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },

  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  publishDate: { type: Date, default: Date.now, index: true },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);


