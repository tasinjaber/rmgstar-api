const express = require('express');
const router = express.Router();
const HeaderSettings = require('../../models/HeaderSettings');
const { authenticate, authorize } = require('../../middleware/auth');

// Log route file loading
console.log('✅ Header route file loaded');

// Test route to verify route is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Header route is working!' });
});

// Get header settings (requires auth for admin panel)
router.get('/', authenticate, async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default header settings');
      return res.json({
        success: true,
        data: {
          settings: {
            logo: '',
            logoWidth: 200,
            logoHeight: 60,
            siteName: 'RMG Platform',
            menuItems: [],
            availableMenuItems: [
              { text: 'Home', link: '/', isSelected: true },
              { text: 'Courses', link: '/courses', isSelected: true },
              { text: 'Jobs', link: '/jobs', isSelected: true },
              { text: 'Library', link: '/library', isSelected: true },
              { text: 'Blog', link: '/blog', isSelected: true },
              { text: 'Training Calendar', link: '/training-calendar', isSelected: true },
              { text: 'Community', link: '/community', isSelected: false }
            ],
            buttons: [],
            showLoginButton: true,
            showRegisterButton: true,
            showVerifyCertificateButton: true
          }
        }
      });
    }

    const settings = await HeaderSettings.getSettings();
    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Header settings fetch error:', error);
    // Return default settings instead of error - always return success
    // This ensures the frontend doesn't show error messages
    return res.json({
      success: true,
      data: {
        settings: {
          logo: '',
          logoWidth: 200,
          logoHeight: 60,
          siteName: 'RMG Platform',
          menuItems: [],
          availableMenuItems: [
            { text: 'Home', link: '/', isSelected: true },
            { text: 'Courses', link: '/courses', isSelected: true },
            { text: 'Jobs', link: '/jobs', isSelected: true },
            { text: 'Library', link: '/library', isSelected: true },
            { text: 'Blog', link: '/blog', isSelected: true },
            { text: 'Training Calendar', link: '/training-calendar', isSelected: true },
            { text: 'Community', link: '/community', isSelected: false }
          ],
          buttons: [],
          showLoginButton: true,
          showRegisterButton: true,
          showVerifyCertificateButton: true
        }
      }
    });
  }
});

// Update header settings (auth already applied globally in admin routes)
router.put('/', async (req, res) => {
  try {
    console.log('📝 PUT /admin/header - Request received');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    if (!req.body.siteName || req.body.siteName.trim() === '') {
      console.log('❌ Validation failed: Site name is required');
      return res.status(400).json({
        success: false,
        message: 'Site name is required'
      });
    }

    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    let settings = await HeaderSettings.findOne();
    console.log('📊 Existing settings:', settings ? 'Found' : 'Not found');
    
    // Prepare update data
    const updateData = {
      logo: req.body.logo || '',
      logoWidth: req.body.logoWidth || 200,
      logoHeight: req.body.logoHeight || 60,
      siteName: req.body.siteName.trim(),
      menuItems: req.body.menuItems || [],
      availableMenuItems: req.body.availableMenuItems || [],
      buttons: req.body.buttons || [],
      showLoginButton: req.body.showLoginButton !== undefined ? req.body.showLoginButton : true,
      showRegisterButton: req.body.showRegisterButton !== undefined ? req.body.showRegisterButton : true,
      showVerifyCertificateButton: req.body.showVerifyCertificateButton !== undefined ? req.body.showVerifyCertificateButton : true
    };
    
    console.log('📝 Logo URL to save:', updateData.logo);
    console.log('📝 Site Name to save:', updateData.siteName);
    
    if (!settings) {
      console.log('📝 Creating new header settings');
      settings = await HeaderSettings.create(updateData);
    } else {
      console.log('📝 Updating existing header settings');
      settings = await HeaderSettings.findOneAndUpdate(
        {},
        updateData,
        { new: true, upsert: true, runValidators: true }
      );
    }

    console.log('✅ Header settings saved successfully');
    console.log('✅ Saved logo URL:', settings.logo);
    console.log('✅ Saved site name:', settings.siteName);
    res.json({
      success: true,
      message: 'Header settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Header settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update header settings',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

