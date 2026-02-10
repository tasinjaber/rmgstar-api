const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Public endpoint for favicon (no auth required)
router.get('/favicon', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: {
          favicon: ''
        }
      });
    }

    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: {
        favicon: settings.favicon || ''
      }
    });
  } catch (error) {
    console.error('Favicon fetch error:', error);
    // Return empty favicon on error (don't break the site)
    res.json({
      success: true,
      data: {
        favicon: ''
      }
    });
  }
});

module.exports = router;

