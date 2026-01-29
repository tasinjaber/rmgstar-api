const crypto = require('crypto');

// SSLcommerz Payment Gateway Integration
class SSLcommerzGateway {
  constructor(config = null) {
    // Prefer DB-driven config (admin settings), fallback to .env
    this.storeId = config?.storeId || process.env.SSLCOMMERZ_STORE_ID || 'demo';
    this.storePassword = config?.storePassword || process.env.SSLCOMMERZ_STORE_PASSWORD || 'demo';
    this.isLive = (typeof config?.isLive === 'boolean') ? config.isLive : (process.env.SSLCOMMERZ_IS_LIVE === 'true');
    this.baseUrl = this.isLive 
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';
  }

  generateSession(orderData) {
    const {
      totalAmount,
      currency = 'BDT',
      tranId,
      successUrl,
      failUrl,
      cancelUrl,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      productName,
      productCategory,
      productProfile = 'general'
    } = orderData;

    const postData = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: totalAmount,
      currency: currency,
      tran_id: tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      cus_name: customerName,
      cus_email: customerEmail,
      cus_phone: customerPhone,
      cus_add1: customerAddress,
      product_name: productName,
      product_category: productCategory,
      product_profile: productProfile
    };

    return {
      url: `${this.baseUrl}/gwprocess/v4/api.php`,
      method: 'POST',
      data: postData
    };
  }

  verifyPayment(tranId, amount, valId) {
    // Verify payment with SSLcommerz
    return {
      url: `${this.baseUrl}/validator/api/validationserverAPI.php`,
      method: 'GET',
      params: {
        val_id: valId,
        store_id: this.storeId,
        store_passwd: this.storePassword,
        format: 'json'
      }
    };
  }
}

// bKash Payment Gateway Integration
class BkashGateway {
  constructor(config = null) {
    // Prefer DB-driven config (admin settings), fallback to .env
    this.appKey = config?.appKey || process.env.BKASH_APP_KEY || 'demo_app_key';
    this.appSecret = config?.appSecret || process.env.BKASH_APP_SECRET || 'demo_app_secret';
    this.username = config?.username || process.env.BKASH_USERNAME || 'demo_username';
    this.password = config?.password || process.env.BKASH_PASSWORD || 'demo_password';
    this.isLive = (typeof config?.isLive === 'boolean') ? config.isLive : (process.env.BKASH_IS_LIVE === 'true');
    this.baseUrl = this.isLive
      ? 'https://tokenized.pay.bka.sh'
      : 'https://tokenized.sandbox.bka.sh';
  }

  async getToken() {
    // Get access token from bKash
    // This should be cached and refreshed when expired
    return {
      url: `${this.baseUrl}/v1.2.0-beta/tokenized/checkout/token/grant`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': this.username,
        'password': this.password
      },
      data: {
        app_key: this.appKey,
        app_secret: this.appSecret
      }
    };
  }

  createPayment(orderData) {
    const {
      amount,
      currency = 'BDT',
      intent = 'sale',
      merchantInvoiceNumber,
      callbackURL
    } = orderData;

    return {
      url: `${this.baseUrl}/v1.2.0-beta/tokenized/checkout/payment/create`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {token}', // Token should be obtained first
        'X-APP-Key': this.appKey
      },
      data: {
        amount: amount,
        currency: currency,
        intent: intent,
        merchantInvoiceNumber: merchantInvoiceNumber,
        callbackURL: callbackURL
      }
    };
  }

  executePayment(paymentID) {
    return {
      url: `${this.baseUrl}/v1.2.0-beta/tokenized/checkout/payment/execute/${paymentID}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {token}',
        'X-APP-Key': this.appKey
      }
    };
  }
}

module.exports = {
  SSLcommerzGateway,
  BkashGateway
};

