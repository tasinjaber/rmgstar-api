const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
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
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate({
        path: 'batchId',
        select: 'batchName batchNumber startDate mode courseId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Fallback: resolve course via Course.batchId when batch has no course
    const batchIdsNeedingCourse = [...new Set(
      enrollments
        .filter(e => e.batchId && !(e.batchId.courseId && e.batchId.courseId.title))
        .map(e => e.batchId && e.batchId._id ? e.batchId._id.toString() : null)
        .filter(Boolean)
    )];
    const coursesByBatchId = {};
    if (batchIdsNeedingCourse.length > 0) {
      const objectIds = batchIdsNeedingCourse.map(id => new mongoose.Types.ObjectId(id));
      const courses = await Course.find({ batchId: { $in: objectIds } })
        .select('title slug thumbnailImage shortDescription price discountPrice batchId')
        .lean();
      courses.forEach(c => {
        if (c.batchId) coursesByBatchId[c.batchId.toString()] = c;
      });
    }
    enrollments.forEach(e => {
      if (e.batchId) {
        const needCourse = !(e.batchId.courseId && e.batchId.courseId.title);
        if (needCourse) {
          const bid = e.batchId._id ? e.batchId._id.toString() : e.batchId.toString();
          const course = coursesByBatchId[bid];
          if (course) {
            e.batchId.courseId = course;
          }
        }
      }
    });

    res.json({
      success: true,
      data: { enrollments }
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

