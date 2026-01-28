const mongoose = require('mongoose');

const trainerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    default: ''
  },
  expertiseAreas: [{
    type: String
  }],
  photo: {
    type: String,
    default: ''
  },
  socialLinks: {
    linkedin: String,
    facebook: String,
    twitter: String,
    website: String
  }
}, {
  timestamps: true
});

trainerProfileSchema.index({ userId: 1 });

module.exports = mongoose.model('TrainerProfile', trainerProfileSchema);

