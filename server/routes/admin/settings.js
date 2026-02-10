const express = require('express');
const router = express.Router();
const Settings = require('../../models/Settings');

// Get settings (requires admin auth)
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default settings');
      return res.json({
        success: true,
        data: {
          siteName: 'RMG Training Platform',
          primaryColor: '#2563eb',
          contactEmail: 'info@platform.com',
          contactPhone: '+880-1234567890',
          favicon: ''
        }
      });
    }

    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    // Return default settings on error
    res.json({
      success: true,
      data: {
        siteName: 'RMG Training Platform',
        primaryColor: '#2563eb',
        contactEmail: 'info@platform.com',
        contactPhone: '+880-1234567890',
        favicon: ''
      }
    });
  }
});

// Update settings (requires admin auth)
router.put('/', async (req, res) => {
  try {
    console.log('📝 PUT /admin/settings - Request received');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    // Prepare update data
    const updateData = {
      siteName: req.body.siteName || 'RMG Training Platform',
      primaryColor: req.body.primaryColor || '#2563eb',
      contactEmail: req.body.contactEmail || 'info@platform.com',
      contactPhone: req.body.contactPhone || '+880-1234567890',
      favicon: req.body.favicon || ''
    };

    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('📝 Creating new settings');
      settings = await Settings.create(updateData);
    } else {
      console.log('📝 Updating existing settings');
      settings = await Settings.findOneAndUpdate(
        {},
        updateData,
        { new: true, upsert: true, runValidators: true }
      );
    }

    console.log('✅ Settings saved successfully');
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

