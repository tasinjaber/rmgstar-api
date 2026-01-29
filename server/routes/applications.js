const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');
const JobPost = require('../models/JobPost');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { sendMailSafe } = require('../utils/mailer');
const { applicantEmail, reviewerEmail } = require('../utils/jobApplicationEmailTemplates');

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

    // Fire-and-forget emails (do not block application creation)
    const adminEmail = process.env.ADMIN_EMAIL;
    const companyEmail = job.companyEmail || '';
    const summary = `Job: ${job.title}\nCompany: ${job.companyName}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nCV: ${cvUrl || ''}`;

    // Applicant confirmation
    sendMailSafe({
      to: email,
      subject: `Application submitted: ${job.title} (${job.companyName})`,
      html: applicantEmail({
        applicantName: name,
        jobTitle: job.title,
        companyName: job.companyName,
        summary
      })
    });

    // Admin + Company notification (include all details)
    const reviewerHtml = reviewerEmail({
      title: 'New job application received',
      jobTitle: job.title,
      companyName: job.companyName,
      applicant: { name, email, phone },
      cvUrl: cvUrl || '',
      message: coverLetter || message || ''
    });

    if (adminEmail) {
      sendMailSafe({
        to: adminEmail,
        subject: `New application: ${job.title} (${job.companyName})`,
        html: reviewerHtml
      });
    }
    if (companyEmail) {
      sendMailSafe({
        to: companyEmail,
        subject: `New application: ${job.title} (${job.companyName})`,
        html: reviewerHtml
      });
    }

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

