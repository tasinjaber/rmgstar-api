const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employer = require('../models/Employer');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

// Register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'instructor']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role = 'student', phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user - instructors are pending approval (isActive: false)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      phone,
      isActive: role === 'instructor' ? false : true // Instructors need admin approval
    });

    // Don't generate token for instructors - they need approval first
    let token = null;
    if (role === 'student') {
      token = generateToken(user._id);
    }

    res.status(201).json({
      success: true,
      message: role === 'instructor' 
        ? 'Registration successful. Your instructor account is pending admin approval.' 
        : 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Login failed: Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database not connected. Please ensure MongoDB is running and restart the server.',
        error: 'DATABASE_NOT_CONNECTED'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Login failed: User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Login failed: Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    
    // Populate role-specific data
    let profileData = {};
    if (user.role === 'employer') {
      const employer = await Employer.findOne({ userId: user._id });
      profileData = employer || {};
    } else if (user.role === 'trainer') {
      const TrainerProfile = require('../models/TrainerProfile');
      const trainer = await TrainerProfile.findOne({ userId: user._id });
      profileData = trainer || {};
    }

    res.json({
      success: true,
      data: {
        user,
        profile: profileData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      error: error.message
    });
  }
});

// Logout (client-side token removal, but endpoint for consistency)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;

