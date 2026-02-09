const express = require('express');
const router = express.Router();
const Batch = require('../../models/Batch');
const Course = require('../../models/Course');

// Get single batch
router.get('/:id', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('trainerId', 'name');
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({ success: true, data: { batch } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message
    });
  }
});

// Get all batches
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, courseId, status } = req.query;
    const query = {};

    if (courseId) query.courseId = courseId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const batches = await Batch.find(query)
      .populate('courseId', 'title')
      .populate('trainerId', 'name')
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

// Create batch
router.post('/', async (req, res) => {
  try {
    const batchData = { ...req.body };
    
    // Convert weekWiseTimes object to Map if provided
    if (batchData.weekWiseTimes && typeof batchData.weekWiseTimes === 'object' && !(batchData.weekWiseTimes instanceof Map)) {
      const weekWiseTimesMap = new Map();
      Object.entries(batchData.weekWiseTimes).forEach(([day, times]) => {
        weekWiseTimesMap.set(day, times);
      });
      batchData.weekWiseTimes = weekWiseTimesMap;
    }
    
    const batch = await Batch.create(batchData);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: { batch }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create batch',
      error: error.message
    });
  }
});

// Update batch
router.put('/:id', async (req, res) => {
  try {
    const batchData = { ...req.body };
    
    // Convert weekWiseTimes object to Map if provided
    if (batchData.weekWiseTimes && typeof batchData.weekWiseTimes === 'object' && !(batchData.weekWiseTimes instanceof Map)) {
      const weekWiseTimesMap = new Map();
      Object.entries(batchData.weekWiseTimes).forEach(([day, times]) => {
        weekWiseTimesMap.set(day, times);
      });
      batchData.weekWiseTimes = weekWiseTimesMap;
    }
    
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      batchData,
      { new: true, runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: { batch }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update batch',
      error: error.message
    });
  }
});

// Delete batch
router.delete('/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
      error: error.message
    });
  }
});

module.exports = router;

