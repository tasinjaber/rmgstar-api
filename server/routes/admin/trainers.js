const express = require('express');
const router = express.Router();
const TrainerProfile = require('../../models/TrainerProfile');
const User = require('../../models/User');

// Get all trainers/instructors with full details
router.get('/', async (req, res) => {
  try {
    const trainers = await TrainerProfile.find()
      .populate('userId', 'name email avatar phone role isActive');

    // Get courses assigned to each trainer
    const Course = require('../../models/Course');
    const trainersWithCourses = await Promise.all(
      trainers.map(async (trainer) => {
        if (!trainer.userId || !trainer.userId._id) {
          return null
        }
        const courses = await Course.find({ trainerId: trainer.userId._id })
          .select('title slug thumbnailImage')
          .limit(10);
        return {
          ...trainer.toObject(),
          assignedCourses: courses
        };
      })
    );

    // Filter out null entries
    const validTrainers = trainersWithCourses.filter(t => t !== null)

    res.json({
      success: true,
      data: { trainers: validTrainers }
    });
  } catch (error) {
    console.error('❌ Error fetching trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers',
      error: error.message
    });
  }
});

// Create trainer profile
router.post('/', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'trainer' && user.role !== 'instructor') {
      return res.status(400).json({
        success: false,
        message: 'User must have instructor/trainer role'
      });
    }

    const trainer = await TrainerProfile.create({
      userId,
      ...profileData
    });

    res.status(201).json({
      success: true,
      message: 'Trainer profile created successfully',
      data: { trainer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create trainer profile',
      error: error.message
    });
  }
});

// Get single trainer by ID
router.get('/:id', async (req, res) => {
  try {
    const trainer = await TrainerProfile.findById(req.params.id)
      .populate('userId', 'name email avatar phone role isActive');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found'
      });
    }

    // Get assigned courses
    const Course = require('../../models/Course');
    const courses = await Course.find({ trainerId: trainer.userId._id })
      .select('title slug thumbnailImage');

    res.json({
      success: true,
      data: {
        trainer: {
          ...trainer.toObject(),
          assignedCourses: courses
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer',
      error: error.message
    });
  }
});

// Update trainer
router.put('/:id', async (req, res) => {
  try {
    const trainer = await TrainerProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email avatar phone role isActive');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Trainer profile updated successfully',
      data: { trainer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update trainer profile',
      error: error.message
    });
  }
});

// Delete trainer
router.delete('/:id', async (req, res) => {
  try {
    const trainer = await TrainerProfile.findByIdAndDelete(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Trainer profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainer profile',
      error: error.message
    });
  }
});

module.exports = router;

