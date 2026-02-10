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

// Public endpoint for site title (no auth required)
router.get('/title', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: {
          siteTitle: 'RMG Training Platform',
          siteName: 'RMG Training Platform'
        }
      });
    }

    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: {
        siteTitle: settings.siteTitle || settings.siteName || 'RMG Training Platform',
        siteName: settings.siteName || 'RMG Training Platform'
      }
    });
  } catch (error) {
    console.error('Title fetch error:', error);
    // Return default title on error
    res.json({
      success: true,
      data: {
        siteTitle: 'RMG Training Platform',
        siteName: 'RMG Training Platform'
      }
    });
  }
});

module.exports = router;

