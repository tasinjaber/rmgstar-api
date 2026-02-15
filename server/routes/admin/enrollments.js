const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Enrollment = require('../../models/Enrollment');
const Course = require('../../models/Course');

// Get all enrollments
router.get('/', async (req, res) => {
  try {
    const { courseId, batchId, paymentStatus, category, startDate, page = 1, limit = 20 } = req.query;
    const query = {};

    if (courseId) {
      const Batch = require('../../models/Batch');
      const batches = await Batch.find({ courseId }).select('_id');
      query.batchId = { $in: batches.map(b => b._id) };
    }
    if (batchId) query.batchId = batchId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (category) {
      const Batch = require('../../models/Batch');
      const courseIds = (await Course.find({ category }).select('_id')).map(c => c._id);
      const batches = await Batch.find({ courseId: { $in: courseIds } }).select('_id');
      query.batchId = { $in: batches.map(b => b._id) };
    }
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const enrollments = await Enrollment.find(query)
      .populate('studentId', 'name email phone')
      .populate({
        path: 'batchId',
        select: 'batchName batchNumber startDate endDate startTime endTime mode seatLimit enrolledCount status courseId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Enrollment.countDocuments(query);

    // Fallback: resolve course via Course.batchId when batch has no courseId
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
      data: {
        enrollments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments',
      error: error.message
    });
  }
});

// Get single enrollment
router.get('/:id', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('studentId', 'name email phone')
      .populate({
        path: 'batchId',
        select: 'batchName batchNumber startDate endDate mode courseId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      })
      .lean();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Fallback: resolve course via Course.batchId when batch has no course
    if (enrollment.batchId && !(enrollment.batchId.courseId && enrollment.batchId.courseId.title)) {
      const batchId = enrollment.batchId._id || enrollment.batchId;
      const course = await Course.findOne({ batchId })
        .select('title slug thumbnailImage shortDescription price discountPrice')
        .lean();
      if (course) enrollment.batchId.courseId = course;
    }

    res.json({
      success: true,
      data: { enrollment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment',
      error: error.message
    });
  }
});

// Update enrollment (e.g., payment status)
router.put('/:id', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, transactionId, amountPaid } = req.body;
    const Batch = require('../../models/Batch');

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    if (amountPaid !== undefined) updateData.amountPaid = amountPaid;

    // If payment status is being changed to 'paid' and it was 'pending', update batch count
    if (paymentStatus === 'paid' && enrollment.paymentStatus === 'pending') {
      await Batch.findByIdAndUpdate(enrollment.batchId, {
        $inc: { enrolledCount: 1 }
      });
    }

    // If payment status is being changed from 'paid' to something else, decrease batch count
    if (enrollment.paymentStatus === 'paid' && paymentStatus && paymentStatus !== 'paid') {
      await Batch.findByIdAndUpdate(enrollment.batchId, {
        $inc: { enrolledCount: -1 }
      });
    }

    const updated = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('studentId', 'name email phone')
      .populate({
        path: 'batchId',
        select: 'batchName batchNumber startDate mode courseId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage price discountPrice'
        }
      });

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      data: { enrollment: updated }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment',
      error: error.message
    });
  }
});

module.exports = router;

