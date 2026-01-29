const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path - server/uploads/avatars (same as static file serving)
    // __dirname is server/routes/admin, so go up 2 levels to server, then into uploads/avatars
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const MAX_IMAGE_MB = parseInt(process.env.UPLOAD_MAX_IMAGE_MB || '50', 10);

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Create user with avatar upload
router.post('/', upload.single('avatar'), [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone, permissions = [] } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userData = {
      name,
      email,
      passwordHash,
      role: role.trim().toLowerCase(),
      phone,
      permissions
    };
    
    if (req.file) {
      // Store path relative to uploads directory for static serving
      userData.avatar = `/uploads/avatars/${req.file.filename}`;
    }
    
    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: { ...user.toObject(), passwordHash: undefined } }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Update user with avatar upload
router.put('/:id', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, role, phone, isActive, permissions } = req.body;
    const updateData = { name, email, role, phone, isActive };
    if (permissions) updateData.permissions = permissions;

    if (req.body.password) {
      updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if exists
      const existingUser = await User.findById(req.params.id);
      if (existingUser && existingUser.avatar) {
        // Construct full path to old avatar file
        const oldAvatarPath = existingUser.avatar.replace('/uploads/', '');
        const oldPath = path.join(__dirname, '../../uploads', oldAvatarPath);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (err) {
            console.error('Error deleting old avatar:', err);
          }
        }
      }
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Approve instructor
router.post('/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'instructor') {
      return res.status(400).json({
        success: false,
        message: 'Only instructors can be approved'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'Instructor approved successfully',
      data: { user: await User.findById(user._id).select('-passwordHash') }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve instructor',
      error: error.message
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

module.exports = router;

