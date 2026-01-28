const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { authenticate } = require('../middleware/auth');

// Get student's own certificates (authenticated)
router.get('/my-certificates', authenticate, async (req, res) => {
  try {
    const certificates = await Certificate.find({
      studentId: req.user._id,
      status: 'active'
    })
      .populate('courseId', 'title slug thumbnailImage')
      .populate('batchId', 'startDate endDate')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { certificates }
    });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
});

// Public route: Verify certificate by verification number (no auth required)
router.get('/verify/:verificationNumber', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      verificationNumber: req.params.verificationNumber 
    })
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl')
      .populate('courseId', 'title slug');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found or invalid verification number' 
      });
    }

    if (certificate.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Certificate is ${certificate.status}`
      });
    }

    res.json({ success: true, data: { certificate } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
});

module.exports = router;

