const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');
const JobPost = require('../models/JobPost');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Apply for a job (supports both authenticated and non-authenticated users)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { jobId, name, email, phone, message, cvUrl, coverLetter } = req.body;

    // Get applicantId if user is authenticated
    const applicantId = req.user?._id || null;

    // Validate required fields
    if (!name || !email || !phone || !cvUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and CV are required'
      });
    }

    const job = await JobPost.findById(jobId);
    if (!job || !job.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (new Date(job.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if already applied (by email if not authenticated, or by applicantId if authenticated)
    const existing = applicantId 
      ? await JobApplication.findOne({ jobId, applicantId })
      : await JobApplication.findOne({ jobId, email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already applied for this job'
      });
    }

    const application = await JobApplication.create({
      jobId,
      applicantId: applicantId || undefined,
      name,
      email,
      phone,
      cvUrl: cvUrl || '',
      coverLetter: coverLetter || message || '',
      message: message || ''
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({
      success: false,
      message: 'Application failed',
      error: error.message
    });
  }
});

// Get user's applications
router.get('/my-applications', authenticate, async (req, res) => {
  try {
    const applications = await JobApplication.find({ applicantId: req.user._id })
      .populate({
        path: 'jobId',
        select: 'title companyName location category deadline'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { applications }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
});

module.exports = router;

