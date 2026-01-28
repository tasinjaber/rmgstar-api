const mongoose = require('mongoose');

// Check if MongoDB is connected
exports.requireDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected. Please restart the server.',
      error: 'MongoDB connection not established'
    });
  }
  next();
};

