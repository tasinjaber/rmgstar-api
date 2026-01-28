const mongoose = require('mongoose');

const homepageContentSchema = new mongoose.Schema({
  heroTitle: {
    type: String,
    default: ''
  },
  heroSubtitle: {
    type: String,
    default: ''
  },
  heroButtons: [{
    text: String,
    link: String,
    variant: String // primary, secondary
  }],
  founderName: {
    type: String,
    default: ''
  },
  founderTitle: {
    type: String,
    default: ''
  },
  founderBio: {
    type: String,
    default: ''
  },
  founderPhoto: {
    type: String,
    default: ''
  },
  featureCards: [{
    icon: String,
    title: String,
    description: String,
    link: String,
    buttonText: String,
    color: String
  }],
  impactTitle: {
    type: String,
    default: ''
  },
  impactSubtitle: {
    type: String,
    default: ''
  },
  impactStats: [{
    icon: String,      // e.g. "GraduationCap"
    label: String,     // e.g. "Active Students"
    value: Number,     // e.g. 2500
    color: String,     // e.g. "blue" | "green" | ...
    bgColor: String    // e.g. "bg-blue-50"
  }],
  communityTitle: {
    type: String,
    default: ''
  },
  communityText: {
    type: String,
    default: ''
  },
  communityVideoUrl: {
    type: String,
    default: ''
  },
  communityJoinLink: {
    type: String,
    default: ''
  },
  communityWatchLink: {
    type: String,
    default: ''
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    youtube: String,
    instagram: String,
    pinterest: String
  },
  footerText: {
    type: String,
    default: ''
  },
  footerLogo: {
    type: String,
    default: ''
  },
  footerSiteName: {
    type: String,
    default: ''
  },
  footerDescription: {
    type: String,
    default: ''
  },
  footerContactInfo: {
    email: String,
    phone: String,
    address: String
  },
  footerMenus: [{
    title: String,
    links: [{
      name: String,
      href: String
    }]
  }],
  footerSocialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    youtube: String,
    instagram: String,
    pinterest: String
  },
  contactEmail: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HomepageContent', homepageContentSchema);

