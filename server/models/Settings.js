const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'RMG Training Platform'
  },
  siteTitle: {
    type: String,
    default: 'RMG Training Platform'
  },
  primaryColor: {
    type: String,
    default: '#2563eb'
  },
  contactEmail: {
    type: String,
    default: 'info@platform.com'
  },
  contactPhone: {
    type: String,
    default: '+880-1234567890'
  },
  favicon: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure only one document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings
    settings = await this.create({
      siteName: 'RMG Training Platform',
      siteTitle: 'RMG Training Platform',
      primaryColor: '#2563eb',
      contactEmail: 'info@platform.com',
      contactPhone: '+880-1234567890',
      favicon: ''
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);

