const express = require('express');
const router = express.Router();

// This would typically use a Settings model
// For now, return a simple response
router.get('/', async (req, res) => {
  res.json({
    success: true,
    data: {
      siteName: 'RMG Training Platform',
      primaryColor: '#2563eb',
      contactEmail: 'info@platform.com',
      contactPhone: '+880-1234567890'
    }
  });
});

router.put('/', async (req, res) => {
  // In a real app, save to database
  res.json({
    success: true,
    message: 'Settings updated successfully'
  });
});

module.exports = router;

