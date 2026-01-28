const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    
    // Populate role-specific data
    let profileData = {};
    if (user.role === 'employer') {
      const Employer = require('../models/Employer');
      const employer = await Employer.findOne({ userId: user._id });
      profileData = employer || {};
    } else if (user.role === 'trainer') {
      const TrainerProfile = require('../models/TrainerProfile');
      const trainer = await TrainerProfile.findOne({ userId: user._id });
      profileData = trainer || {};
    }

    res.json({
      success: true,
      data: {
        user,
        profile: profileData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = router;

