const express = require('express');
const router = express.Router();
const LibraryItem = require('../models/LibraryItem');
const LibraryPurchase = require('../models/LibraryPurchase');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get all library items
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default library items');
      const defaultItems = [
        {
          _id: '1',
          title: 'RMG Production Guide',
          description: 'Comprehensive guide to garment production processes',
          coverImage: '',
          category: 'Production',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        },
        {
          _id: '2',
          title: 'Quality Control Handbook',
          description: 'Essential quality control procedures and standards',
          coverImage: '',
          category: 'Quality Control',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        },
        {
          _id: '3',
          title: 'Merchandising Manual',
          description: 'Complete guide to RMG merchandising practices',
          coverImage: '',
          category: 'Merchandising',
          format: 'PDF',
          isMembersOnly: false,
          author: 'Expert Team',
          publishDate: new Date()
        }
      ];
      
      const { limit = 12 } = req.query;
      const items = defaultItems.slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: items.length,
            pages: 1
          }
        }
      });
    }

    const {
      category,
      format,
      search,
      membersOnly,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (format) query.format = format;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // If not authenticated, exclude members-only items
    if (!req.user) {
      query.isMembersOnly = false;
    } else if (membersOnly === 'true') {
      query.isMembersOnly = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await LibraryItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LibraryItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items,
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
      message: 'Failed to fetch library items',
      error: error.message
    });
  }
});

// Get single library item
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ slug: req.params.slug });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Library item not found'
      });
    }

    // If members-only, require login to view details at all
    if (item.isMembersOnly && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Members-only content. Please login to access.'
      });
    }

    // Determine purchase/access (book-store behavior)
    const isPaidItem = (item.price || 0) > 0;
    let purchase = null;
    let canAccessPaidContent = !isPaidItem;

    if (req.user && isPaidItem) {
      purchase = await LibraryPurchase.findOne({
        userId: req.user._id,
        itemId: item._id
      }).lean();
      canAccessPaidContent = purchase?.paymentStatus === 'paid';
    }

    // Never expose paid download url unless access is granted
    const safeItem = item.toObject();
    if (isPaidItem && !canAccessPaidContent) {
      safeItem.downloadUrl = '';
    }

    res.json({
      success: true,
      data: {
        item: safeItem,
        access: {
          isPaidItem,
          price: item.price || 0,
          currency: item.currency || 'BDT',
          purchaseStatus: purchase?.paymentStatus || (isPaidItem ? 'none' : 'free'),
          canViewPdf: !!safeItem.downloadUrl,
          canDownload: !!safeItem.downloadUrl
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library item',
      error: error.message
    });
  }
});

// Purchase request (manual payment) for a paid item
router.post('/:slug/purchase', authenticate, async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ slug: req.params.slug });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Library item not found' });
    }

    const price = item.price || 0;
    if (price <= 0) {
      return res.status(400).json({ success: false, message: 'This item is free. No purchase required.' });
    }

    const { paymentMethod = 'manual', transactionId = '', phoneNumber = '', note = '' } = req.body || {};
    if (paymentMethod !== 'pay_later') {
      if (!transactionId || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Transaction ID and phone number are required.' });
      }
    }

    const purchase = await LibraryPurchase.findOneAndUpdate(
      { userId: req.user._id, itemId: item._id },
      {
        $set: {
          amount: price,
          currency: item.currency || 'BDT',
          paymentMethod,
          transactionId: paymentMethod === 'pay_later' ? '' : transactionId,
          phoneNumber: paymentMethod === 'pay_later' ? '' : phoneNumber,
          note,
          paymentStatus: 'pending',
          approvedBy: null,
          approvedAt: null
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Purchase request submitted. Waiting for admin approval.',
      data: { purchase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit purchase request',
      error: error.message
    });
  }
});

module.exports = router;

