const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const { optionalAuth } = require('../middleware/auth');

// Get all batches (training calendar)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      courseId,
      trainerId,
      status,
      mode,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (courseId) query.courseId = courseId;
    if (trainerId) query.trainerId = trainerId;
    if (status) query.status = status;
    if (mode) query.mode = mode;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const batches = await Batch.find(query)
      .populate('courseId', 'title slug thumbnailImage')
      .populate('trainerId', 'name avatar')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Batch.countDocuments(query);

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: error.message
    });
  }
});

// Get single batch
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('courseId')
      .populate('trainerId', 'name avatar email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      data: { batch }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message
    });
  }
});

module.exports = router;

