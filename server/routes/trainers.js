const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TrainerProfile = require('../models/TrainerProfile');

// Get all active instructors/trainers (public)
router.get('/', async (req, res) => {
  try {
    // Get users with instructor/trainer role who are active
    const instructors = await User.find({ 
      role: { $in: ['instructor', 'trainer'] },
      isActive: true 
    })
      .select('name email avatar phone')
      .limit(20);

    // Get trainer profiles and merge with user data
    const instructorsWithProfiles = await Promise.all(
      instructors.map(async (user) => {
        const profile = await TrainerProfile.findOne({ userId: user._id });
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || profile?.photo || '',
          phone: user.phone,
          bio: profile?.bio || '',
          expertise: profile?.expertiseAreas?.join(', ') || '',
          expertiseAreas: profile?.expertiseAreas || [],
          rating: 4.8, // Default rating
          studentsCount: 0 // Can be calculated from enrollments if needed
        };
      })
    );

    res.json({
      success: true,
      data: { instructors: instructorsWithProfiles }
    });
  } catch (error) {
    console.error('❌ Error fetching instructors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instructors',
      error: error.message
    });
  }
});

module.exports = router;

