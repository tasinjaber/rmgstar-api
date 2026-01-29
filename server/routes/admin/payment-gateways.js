const express = require('express');
const router = express.Router();
const PaymentGatewaySettings = require('../../models/PaymentGatewaySettings');

async function getSingleton() {
  let doc = await PaymentGatewaySettings.findOne();
  if (!doc) doc = await PaymentGatewaySettings.create({});
  return doc;
}

router.get('/', async (req, res) => {
  try {
    const settings = await getSingleton();
    res.json({ success: true, data: { settings } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment gateway settings', error: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const settings = await getSingleton();
    const payload = req.body || {};

    // shallow merge for known keys
    if (payload.sslcommerz) {
      settings.sslcommerz = { ...settings.sslcommerz.toObject?.() , ...payload.sslcommerz };
    }
    if (payload.bkash) {
      settings.bkash = { ...settings.bkash.toObject?.() , ...payload.bkash };
    }
    if (payload.payLater) {
      settings.payLater = { ...settings.payLater.toObject?.() , ...payload.payLater };
    }

    await settings.save();
    res.json({ success: true, message: 'Payment gateway settings updated', data: { settings } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update payment gateway settings', error: error.message });
  }
});

module.exports = router;


