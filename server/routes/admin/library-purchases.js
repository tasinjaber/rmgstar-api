const express = require('express');
const router = express.Router();
const LibraryPurchase = require('../../models/LibraryPurchase');

// List purchases (pending/paid/etc)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.paymentStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const purchases = await LibraryPurchase.find(query)
      .populate('userId', 'name email')
      .populate('itemId', 'title slug price currency coverImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LibraryPurchase.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchases,
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
      message: 'Failed to fetch purchases',
      error: error.message
    });
  }
});

// Approve/reject a purchase
router.put('/:id', async (req, res) => {
  try {
    const { paymentStatus } = req.body || {};
    if (!paymentStatus || !['pending', 'paid', 'failed', 'rejected'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentStatus' });
    }

    const update = { paymentStatus };
    if (paymentStatus === 'paid') {
      update.approvedBy = req.user?._id || null;
      update.approvedAt = new Date();
    } else if (paymentStatus === 'rejected' || paymentStatus === 'failed') {
      update.approvedBy = req.user?._id || null;
      update.approvedAt = new Date();
    }

    const purchase = await LibraryPurchase.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('userId', 'name email')
      .populate('itemId', 'title slug price currency coverImage');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    res.json({ success: true, message: 'Purchase updated', data: { purchase } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update purchase', error: error.message });
  }
});

module.exports = router;


