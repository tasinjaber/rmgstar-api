const mongoose = require('mongoose');

const headerSettingsSchema = new mongoose.Schema({
  logo: {
    type: String,
    default: ''
  },
  logoWidth: {
    type: Number,
    default: 200 // Recommended width in pixels
  },
  logoHeight: {
    type: Number,
    default: 60 // Recommended height in pixels
  },
  siteName: {
    type: String,
    default: 'RMG Platform'
  },
  menuItems: [{
    text: String,
    link: String,
    isCustom: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  availableMenuItems: [{
    text: String,
    link: String,
    isSelected: {
      type: Boolean,
      default: false
    }
  }],
  buttons: [{
    text: String,
    link: String,
    variant: {
      type: String,
      enum: ['primary', 'secondary', 'outline'],
      default: 'primary'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  showLoginButton: {
    type: Boolean,
    default: true
  },
  showRegisterButton: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one document exists
headerSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings
    settings = await this.create({
      siteName: 'RMG Platform',
      menuItems: [
        { text: 'Home', link: '/', isCustom: false, isActive: true, order: 1 },
        { text: 'Courses', link: '/courses', isCustom: false, isActive: true, order: 2 },
        { text: 'Jobs', link: '/jobs', isCustom: false, isActive: true, order: 3 },
        { text: 'Training Calendar', link: '/training-calendar', isCustom: false, isActive: true, order: 4 },
        { text: 'Library', link: '/library', isCustom: false, isActive: true, order: 5 },
        { text: 'Blog', link: '/blog', isCustom: false, isActive: true, order: 6 },
        { text: 'Community', link: '/community', isCustom: false, isActive: true, order: 7 }
      ],
      availableMenuItems: [
        { text: 'Home', link: '/', isSelected: true },
        { text: 'Courses', link: '/courses', isSelected: true },
        { text: 'Jobs', link: '/jobs', isSelected: true },
        { text: 'Library', link: '/library', isSelected: true },
        { text: 'Blog', link: '/blog', isSelected: true },
        { text: 'Training Calendar', link: '/training-calendar', isSelected: true },
        { text: 'Community', link: '/community', isSelected: false }
      ],
      buttons: [],
      showLoginButton: true,
      showRegisterButton: true
    });
  }
  return settings;
};

module.exports = mongoose.model('HeaderSettings', headerSettingsSchema);

