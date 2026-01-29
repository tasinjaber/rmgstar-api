const mongoose = require('mongoose');

const paymentGatewaySettingsSchema = new mongoose.Schema({
  sslcommerz: {
    enabled: { type: Boolean, default: false },
    storeId: { type: String, default: '' },
    storePassword: { type: String, default: '' },
    isLive: { type: Boolean, default: false }
  },
  bkash: {
    enabled: { type: Boolean, default: false },
    appKey: { type: String, default: '' },
    appSecret: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    isLive: { type: Boolean, default: false }
  },
  payLater: {
    enabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('PaymentGatewaySettings', paymentGatewaySettingsSchema);


