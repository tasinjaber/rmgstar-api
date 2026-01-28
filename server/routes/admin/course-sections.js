const express = require('express');
const router = express.Router();
const CourseSection = require('../../models/CourseSection');
const Course = require('../../models/Course');
const { body, validationResult } = require('express-validator');

// Get all course sections
router.get('/', async (req, res) => {
  try {
    const sections = await CourseSection.find({ isActive: true })
      .populate('courseIds', 'title slug thumbnailImage price discountPrice category level mode')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { sections }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course sections',
      error: error.message
    });
  }
});

// Get single section
router.get('/:id', async (req, res) => {
  try {
    const section = await CourseSection.findById(req.params.id)
      .populate('courseIds', 'title slug thumbnailImage price discountPrice category level mode');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: { section }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section',
      error: error.message
    });
  }
});

// Create course section
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('courseIds').isArray().withMessage('Course IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, category, courseIds, order } = req.body;

    // Validate course IDs exist
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some course IDs are invalid'
      });
    }

    const section = await CourseSection.create({
      title,
      category: category || '',
      courseIds,
      order: order || 0
    });

    const populatedSection = await CourseSection.findById(section._id)
      .populate('courseIds', 'title slug thumbnailImage price discountPrice category level mode');

    res.status(201).json({
      success: true,
      message: 'Course section created successfully',
      data: { section: populatedSection }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create section',
      error: error.message
    });
  }
});

// Update course section
router.put('/:id', async (req, res) => {
  try {
    const { title, category, courseIds, order, isActive } = req.body;

    // Validate course IDs if provided
    if (courseIds && courseIds.length > 0) {
      const courses = await Course.find({ _id: { $in: courseIds } });
      if (courses.length !== courseIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some course IDs are invalid'
        });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (courseIds !== undefined) updateData.courseIds = courseIds;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const section = await CourseSection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('courseIds', 'title slug thumbnailImage price discountPrice category level mode');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      message: 'Section updated successfully',
      data: { section }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update section',
      error: error.message
    });
  }
});

// Delete course section
router.delete('/:id', async (req, res) => {
  try {
    const section = await CourseSection.findByIdAndDelete(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete section',
      error: error.message
    });
  }
});

module.exports = router;

