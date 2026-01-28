const express = require('express');
const router = express.Router();
const Enrollment = require('../../models/Enrollment');

// Get all enrollments
router.get('/', async (req, res) => {
  try {
    const { courseId, batchId, paymentStatus, page = 1, limit = 20 } = req.query;
    const query = {};

    if (courseId) {
      const Batch = require('../../models/Batch');
      const batches = await Batch.find({ courseId }).select('_id');
      query.batchId = { $in: batches.map(b => b._id) };
    }
    if (batchId) query.batchId = batchId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const enrollments = await Enrollment.find(query)
      .populate('studentId', 'name email phone')
      .populate({
        path: 'batchId',
        select: 'startDate endDate startTime endTime mode seatLimit enrolledCount status courseId',
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enrollment.countDocuments(query);

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
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage shortDescription price discountPrice'
        }
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
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
        populate: {
          path: 'courseId',
          select: 'title slug thumbnailImage'
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

