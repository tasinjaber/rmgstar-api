const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const { authenticate, authorize } = require('../middleware/auth');

// Enroll in a batch
router.post('/', authenticate, authorize('student'), async (req, res) => {
  try {
    const { batchId, paymentMethod, transactionId, amountPaid } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    if (batch.status !== 'upcoming' && batch.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll in this batch'
      });
    }

    if (batch.enrolledCount >= batch.seatLimit) {
      return res.status(400).json({
        success: false,
        message: 'Batch is full'
      });
    }

    // Check if already enrolled
    const existing = await Enrollment.findOne({
      studentId: req.user._id,
      batchId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this batch'
      });
    }

    // Determine payment status based on payment method
    let paymentStatus = 'pending';
    if (paymentMethod === 'pay_later') {
      paymentStatus = 'pending'; // Pay Later needs admin approval - no course access
    } else if (paymentMethod === 'sslcommerz' || paymentMethod === 'bkash') {
      // Payment gateway payments are handled via payment callbacks
      paymentStatus = 'pending'; // Will be updated to 'paid' after successful payment
    }

    const enrollment = await Enrollment.create({
      studentId: req.user._id,
      batchId,
      paymentStatus,
      paymentMethod: paymentMethod || '',
      transactionId: transactionId || '',
      amountPaid: amountPaid || 0
    });

    // Only update batch enrolled count if payment is paid or not pay_later
    // Pay Later enrollments don't count until approved
    if (paymentStatus === 'paid' || (paymentMethod !== 'pay_later' && paymentStatus !== 'pending')) {
      await Batch.findByIdAndUpdate(batchId, {
        $inc: { enrolledCount: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: { enrollment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Enrollment failed',
      error: error.message
    });
  }
});

// Get user's enrollments
router.get('/my-enrollments', authenticate, async (req, res) => {
  try {
    const Course = require('../models/Course');
    
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate({
        path: 'batchId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      })
      .sort({ createdAt: -1 });

    // Ensure courseId is properly populated
    const enrollmentsWithCourse = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (enrollment.batchId) {
          // Check if courseId needs to be populated
          if (!enrollment.batchId.courseId || 
              (typeof enrollment.batchId.courseId === 'object' && !enrollment.batchId.courseId.title) ||
              typeof enrollment.batchId.courseId === 'string') {
            
            // Get courseId from batch
            const batch = await Batch.findById(enrollment.batchId._id || enrollment.batchId);
            if (batch && batch.courseId) {
              const course = await Course.findById(batch.courseId)
                .select('title slug thumbnailImage shortDescription price discountPrice')
                .lean();
              if (course) {
                enrollment.batchId.courseId = course;
              }
            }
          }
        }
        return enrollment;
      })
    );

    res.json({
      success: true,
      data: { enrollments: enrollmentsWithCourse }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments',
      error: error.message
    });
  }
});

module.exports = router;

