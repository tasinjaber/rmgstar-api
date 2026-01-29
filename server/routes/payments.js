const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { SSLcommerzGateway, BkashGateway } = require('../utils/paymentGateways');
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');
const LibraryItem = require('../models/LibraryItem');
const LibraryPurchase = require('../models/LibraryPurchase');
const PaymentGatewaySettings = require('../models/PaymentGatewaySettings');
const crypto = require('crypto');

async function getGatewaySettings() {
  let settings = await PaymentGatewaySettings.findOne().lean();
  if (!settings) {
    const created = await PaymentGatewaySettings.create({});
    settings = created.toObject();
  }
  return settings;
}

router.get('/methods', async (req, res) => {
  try {
    const settings = await getGatewaySettings();
    return res.json({
      success: true,
      data: {
        methods: {
          pay_later: { enabled: settings.payLater?.enabled !== false },
          sslcommerz: { enabled: !!settings.sslcommerz?.enabled },
          bkash: { enabled: !!settings.bkash?.enabled }
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payment methods', error: error.message });
  }
});

// Initiate payment
router.post('/initiate', authenticate, authorize('student'), async (req, res) => {
  try {
    const { batchId, paymentMethod, amount, courseId, courseSlug, productType, itemSlug, itemId } = req.body;

    if (!['sslcommerz', 'bkash'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    const settings = await getGatewaySettings();
    if (paymentMethod === 'sslcommerz' && !settings.sslcommerz?.enabled) {
      return res.status(400).json({ success: false, message: 'SSLCommerz is coming soon' });
    }
    if (paymentMethod === 'bkash' && !settings.bkash?.enabled) {
      return res.status(400).json({ success: false, message: 'bKash is coming soon' });
    }

    const isBook = productType === 'book';
    const batch = isBook ? null : await Batch.findById(batchId).populate('courseId');
    if (!isBook && !batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique transaction ID
    const tranId = `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/payments/success?tranId=${tranId}&method=${paymentMethod}`;
    const failUrl = `${baseUrl}/payments/fail?tranId=${tranId}&method=${paymentMethod}`;
    const cancelUrl = isBook
      ? `${baseUrl}/checkout?type=book&slug=${encodeURIComponent(itemSlug || '')}`
      : `${baseUrl}/checkout?course=${courseSlug || batch.courseId.slug}&batch=${batchId}`;

    let productName = isBook ? 'Book' : batch.courseId.title;
    let productCategory = isBook ? 'Book' : 'Education';

    let libraryItem = null;
    if (isBook) {
      libraryItem = itemId ? await LibraryItem.findById(itemId) : await LibraryItem.findOne({ slug: itemSlug });
      if (!libraryItem) return res.status(404).json({ success: false, message: 'Book not found' });
      productName = libraryItem.title;
    }

    if (paymentMethod === 'sslcommerz') {
      const sslGateway = new SSLcommerzGateway({
        storeId: settings.sslcommerz?.storeId,
        storePassword: settings.sslcommerz?.storePassword,
        isLive: settings.sslcommerz?.isLive
      });
      const paymentData = sslGateway.generateSession({
        totalAmount: amount,
        currency: 'BDT',
        tranId: tranId,
        successUrl: successUrl,
        failUrl: failUrl,
        cancelUrl: cancelUrl,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || '',
        customerAddress: '',
        productName,
        productCategory,
        productProfile: 'general'
      });

      if (isBook) {
        await LibraryPurchase.findOneAndUpdate(
          { userId: req.user._id, itemId: libraryItem._id },
          {
            $set: {
              amount: amount,
              currency: 'BDT',
              paymentMethod: 'sslcommerz',
              paymentStatus: 'pending',
              transactionId: tranId,
              approvedBy: null,
              approvedAt: null
            }
          },
          { upsert: true, new: true, runValidators: true }
        );
      } else {
        // Create pending enrollment
        await Enrollment.create({
          studentId: req.user._id,
          batchId: batchId,
          paymentStatus: 'pending',
          paymentMethod: 'sslcommerz',
          transactionId: tranId,
          amountPaid: 0
        });
      }

      res.json({
        success: true,
        message: 'Payment session created',
        data: {
          paymentUrl: `${paymentData.url}?${new URLSearchParams(paymentData.data).toString()}`,
          tranId: tranId
        }
      });
    } else if (paymentMethod === 'bkash') {
      const bkashGateway = new BkashGateway({
        appKey: settings.bkash?.appKey,
        appSecret: settings.bkash?.appSecret,
        username: settings.bkash?.username,
        password: settings.bkash?.password,
        isLive: settings.bkash?.isLive
      });
      
      // For bKash, we need to get token first (simplified for demo)
      // In production, implement proper token management
      const paymentData = bkashGateway.createPayment({
        amount: amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: tranId,
        callbackURL: successUrl
      });

      if (isBook) {
        await LibraryPurchase.findOneAndUpdate(
          { userId: req.user._id, itemId: libraryItem._id },
          {
            $set: {
              amount: amount,
              currency: 'BDT',
              paymentMethod: 'bkash',
              paymentStatus: 'pending',
              transactionId: tranId,
              approvedBy: null,
              approvedAt: null
            }
          },
          { upsert: true, new: true, runValidators: true }
        );
      } else {
        // Create pending enrollment
        await Enrollment.create({
          studentId: req.user._id,
          batchId: batchId,
          paymentStatus: 'pending',
          paymentMethod: 'bkash',
          transactionId: tranId,
          amountPaid: 0
        });
      }

      res.json({
        success: true,
        message: 'bKash payment initiated',
        data: {
          paymentUrl: `${baseUrl}/payments/bkash?tranId=${tranId}`,
          tranId: tranId,
          // In production, return actual bKash payment URL
          note: 'bKash payment integration - use demo credentials for testing'
        }
      });
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// Confirm payment from frontend callback page (JSON response)
router.get('/confirm', authenticate, async (req, res) => {
  try {
    const { tranId, method } = req.query;

    const enrollment = await Enrollment.findOne({ transactionId: tranId });
    const purchase = enrollment ? null : await LibraryPurchase.findOne({ transactionId: tranId });
    if (!enrollment && !purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Verify payment with gateway (demo: mark as paid)
    let amountToMark = 0;
    if (enrollment) {
      const batch = await Batch.findById(enrollment.batchId).populate('courseId');
      amountToMark = batch?.courseId?.discountPrice || batch?.courseId?.price || 0;
    } else if (purchase) {
      amountToMark = purchase.amount || 0;
    }

    if (enrollment && enrollment.paymentStatus !== 'paid') {
      if (method === 'sslcommerz' || method === 'bkash') {
        enrollment.paymentStatus = 'paid';
        enrollment.amountPaid = amountToMark;
        await enrollment.save();

        // Update batch enrolled count after successful payment (avoid double increment)
        await Batch.findByIdAndUpdate(enrollment.batchId, { $inc: { enrolledCount: 1 } });
      }
    }

    if (purchase && purchase.paymentStatus !== 'paid') {
      if (method === 'sslcommerz' || method === 'bkash') {
        purchase.paymentStatus = 'paid';
        purchase.approvedBy = null;
        purchase.approvedAt = new Date();
        await purchase.save();
      }
    }

    return res.json({
      success: true,
      message: 'Payment confirmed',
      data: {
        enrollmentId: enrollment?._id || null,
        libraryPurchaseId: purchase?._id || null,
        redirectTo: '/student/dashboard?success=payment_completed'
      }
    });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

router.get('/confirm-fail', authenticate, async (req, res) => {
  try {
    const { tranId } = req.query;
    const enrollment = await Enrollment.findOne({ transactionId: tranId });
    const purchase = enrollment ? null : await LibraryPurchase.findOne({ transactionId: tranId });
    if (enrollment && enrollment.paymentStatus !== 'paid') {
      enrollment.paymentStatus = 'failed';
      await enrollment.save();
    }
    if (purchase && purchase.paymentStatus !== 'paid') {
      purchase.paymentStatus = 'failed';
      await purchase.save();
    }
    return res.json({
      success: true,
      message: 'Payment marked as failed',
      data: { redirectTo: '/student/dashboard?error=payment_failed' }
    });
  } catch (error) {
    console.error('Payment confirm-fail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark payment', error: error.message });
  }
});

// Payment success callback
router.get('/success', authenticate, async (req, res) => {
  try {
    const { tranId, method } = req.query;

    const enrollment = await Enrollment.findOne({ transactionId: tranId });
    const purchase = enrollment ? null : await LibraryPurchase.findOne({ transactionId: tranId });
    if (!enrollment && !purchase) {
      return res.redirect('/student/dashboard?error=payment_not_found');
    }

    // Verify payment with gateway
    const batch = enrollment ? await Batch.findById(enrollment.batchId).populate('courseId') : null;
    const coursePrice = batch?.courseId?.discountPrice || batch?.courseId?.price || 0;

    if (enrollment && enrollment.paymentStatus !== 'paid' && method === 'sslcommerz') {
      const valId = req.query.val_id;
      // In production, verify with SSLcommerz API
      // For now, mark as paid
      enrollment.paymentStatus = 'paid';
      enrollment.amountPaid = coursePrice;
      await enrollment.save();
      
      // Update batch enrolled count after successful payment
      await Batch.findByIdAndUpdate(enrollment.batchId, {
        $inc: { enrolledCount: 1 }
      });
    } else if (enrollment && enrollment.paymentStatus !== 'paid' && method === 'bkash') {
      const paymentID = req.query.paymentID;
      // In production, verify with bKash API
      enrollment.paymentStatus = 'paid';
      enrollment.amountPaid = coursePrice;
      await enrollment.save();
      
      // Update batch enrolled count after successful payment
      await Batch.findByIdAndUpdate(enrollment.batchId, {
        $inc: { enrolledCount: 1 }
      });
    }

    if (purchase && purchase.paymentStatus !== 'paid' && (method === 'sslcommerz' || method === 'bkash')) {
      purchase.paymentStatus = 'paid';
      purchase.approvedAt = new Date();
      await purchase.save();
    }

    res.redirect('/student/dashboard?success=payment_completed');
  } catch (error) {
    console.error('Payment success callback error:', error);
    res.redirect('/student/dashboard?error=payment_verification_failed');
  }
});

// Payment fail callback
router.get('/fail', authenticate, async (req, res) => {
  try {
    const { tranId } = req.query;
    
    const enrollment = await Enrollment.findOne({ transactionId: tranId });
    if (enrollment) {
      enrollment.paymentStatus = 'failed';
      await enrollment.save();
    }

    res.redirect('/student/dashboard?error=payment_failed');
  } catch (error) {
    console.error('Payment fail callback error:', error);
    res.redirect('/student/dashboard?error=payment_error');
  }
});

module.exports = router;

