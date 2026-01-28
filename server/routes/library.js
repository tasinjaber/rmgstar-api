const express = require('express');
const router = express.Router();
const LibraryItem = require('../models/LibraryItem');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get all library items
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default library items');
      const defaultItems = [
        {
          _id: '1',
          title: 'RMG Production Guide',
          description: 'Comprehensive guide to garment production processes',
          coverImage: '',
          category: 'Production',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        },
        {
          _id: '2',
          title: 'Quality Control Handbook',
          description: 'Essential quality control procedures and standards',
          coverImage: '',
          category: 'Quality Control',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        },
        {
          _id: '3',
          title: 'Merchandising Manual',
          description: 'Complete guide to RMG merchandising practices',
          coverImage: '',
          category: 'Merchandising',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        }
      ];
      
      const { limit = 12 } = req.query;
      const items = defaultItems.slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: items.length,
            pages: 1
          }
        }
      });
    }

    const {
      category,
      format,
      search,
      membersOnly,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (format) query.format = format;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // If not authenticated, exclude members-only items
    if (!req.user) {
      query.isMembersOnly = false;
    } else if (membersOnly === 'true') {
      query.isMembersOnly = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await LibraryItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LibraryItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items,
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
      message: 'Failed to fetch library items',
      error: error.message
    });
  }
});

// Get single library item
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ slug: req.params.slug });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Library item not found'
      });
    }

    // Check members-only access
    if (item.isMembersOnly && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Members-only content. Please login to access.'
      });
    }

    res.json({
      success: true,
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library item',
      error: error.message
    });
  }
});

module.exports = router;

