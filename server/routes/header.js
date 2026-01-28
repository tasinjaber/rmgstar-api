const express = require('express');
const router = express.Router();
const HeaderSettings = require('../models/HeaderSettings');

// Get header settings (public route)
router.get('/', async (req, res) => {
  try {
    const settings = await HeaderSettings.getSettings();
    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    // Return default settings if database error
    res.json({
      success: true,
      data: {
        settings: {
          logo: '',
          logoWidth: 200,
          logoHeight: 60,
          siteName: 'RMG Platform',
          menuItems: [
            { text: 'Home', link: '/', isCustom: false, isActive: true, order: 1 },
            { text: 'Courses', link: '/courses', isCustom: false, isActive: true, order: 2 },
            { text: 'Jobs', link: '/jobs', isCustom: false, isActive: true, order: 3 },
            { text: 'Training Calendar', link: '/training-calendar', isCustom: false, isActive: true, order: 4 },
            { text: 'Library', link: '/library', isCustom: false, isActive: true, order: 5 },
            { text: 'Blog', link: '/blog', isCustom: false, isActive: true, order: 6 },
            { text: 'Community', link: '/community', isCustom: false, isActive: true, order: 7 }
          ],
          buttons: [],
          showLoginButton: true,
          showRegisterButton: true
        }
      }
    });
  }
});

module.exports = router;

