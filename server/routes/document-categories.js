const express = require('express');
const router = express.Router();
const DocumentCategory = require('../models/DocumentCategory');

// Get all active categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await DocumentCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select('name slug description')
      .select('-__v');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document categories',
      error: error.message
    });
  }
});

module.exports = router;

