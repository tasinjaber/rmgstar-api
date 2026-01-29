const express = require('express');
const router = express.Router();
const HomepageContent = require('../models/HomepageContent');

// Get homepage content (PUBLIC READ)
router.get('/', async (req, res) => {
  try {
    let content = await HomepageContent.findOne();
    if (!content) {
      content = await HomepageContent.create({});
    }

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage content',
      error: error.message
    });
  }
});

// Update homepage content (ADMIN ONLY)
router.put('/', async (req, res) => {
  try {
    let content = await HomepageContent.findOne();
    
    if (!content) {
      content = await HomepageContent.create(req.body);
    } else {
      content = await HomepageContent.findOneAndUpdate(
        {},
        req.body,
        { new: true, upsert: true }
      );
    }

    res.json({
      success: true,
      message: 'Homepage content updated successfully',
      data: { content }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update homepage content',
      error: error.message
    });
  }
});

module.exports = router;
