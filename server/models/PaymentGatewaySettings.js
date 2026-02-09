const mongoose = require('mongoose');

const paymentGatewaySettingsSchema = new mongoose.Schema({
  sslcommerz: {
    enabled: { type: Boolean, default: false },
    storeId: { type: String, default: '' },
    storePassword: { type: String, default: '' },
    isLive: { type: Boolean, default: false }
  },
  bkash: {
    enabled: { type: Boolean, default: false }, // For API
    appKey: { type: String, default: '' },
    appSecret: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    isLive: { type: Boolean, default: false },
    personalEnabled: { type: Boolean, default: false }, // For Personal Payment
    accountNumber: { type: String, default: '' },
    instructions: { type: String, default: '' }
  },
  nagad: {
    enabled: { type: Boolean, default: false },
    accountNumber: { type: String, default: '' },
    instructions: { type: String, default: '' }
  },
  rocket: {
    enabled: { type: Boolean, default: false },
    accountNumber: { type: String, default: '' },
    instructions: { type: String, default: '' }
  },
  payLater: {
    enabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('PaymentGatewaySettings', paymentGatewaySettingsSchema);


