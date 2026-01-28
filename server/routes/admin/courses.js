const express = require('express');
const router = express.Router();
const Course = require('../../models/Course');
const { slugify } = require('../../utils/slugify');
const { body, validationResult } = require('express-validator');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const courses = await Course.find(query)
      .populate('trainerId', 'name email title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
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
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
});

// Get single course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('trainerId', 'name email avatar');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.json({
      success: true,
      data: { course }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
});

// Create course
router.post('/', [
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('category').notEmpty(),
  body('level').notEmpty(),
  body('mode').notEmpty(),
  body('price').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const data = req.body;
    data.slug = slugify(data.title);

    // Ensure unique slug
    let slug = data.slug;
    let counter = 1;
    while (await Course.findOne({ slug })) {
      slug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = slug;

    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    
    // If title changed, update slug
    if (data.title) {
      const course = await Course.findById(req.params.id);
      if (course && course.title !== data.title) {
        data.slug = slugify(data.title);
        // Ensure unique slug
        let slug = data.slug;
        let counter = 1;
        while (await Course.findOne({ slug, _id: { $ne: req.params.id } })) {
          slug = `${data.slug}-${counter}`;
          counter++;
        }
        data.slug = slug;
      }
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
});

// Duplicate course
router.post('/:id/duplicate', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const original = course.toObject();
    delete original._id;
    delete original.slug;
    delete original.createdAt;
    delete original.updatedAt;

    const baseTitle = (original.title || 'Course').trim();
    const match = baseTitle.match(/^(.*?)(?:\s+(\d+))?$/);
    const tBase = (match?.[1] || baseTitle).trim();
    const tNum = match?.[2] ? parseInt(match[2], 10) : 1;
    const newTitle = `${tBase} ${Math.max(2, tNum + 1)}`;

    const data = { ...original, title: newTitle };
    data.slug = slugify(data.title);

    // Ensure unique slug
    let slug = data.slug;
    let counter = 1;
    while (await Course.findOne({ slug })) {
      slug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = slug;

    const created = await Course.create(data);
    return res.status(201).json({
      success: true,
      message: 'Course duplicated successfully',
      data: { course: created }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate course',
      error: error.message
    });
  }
});

module.exports = router;

