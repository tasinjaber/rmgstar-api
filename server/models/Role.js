const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    default: ''
  },
  isSystemDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

roleSchema.index({ name: 1 });

module.exports = mongoose.model('Role', roleSchema);

