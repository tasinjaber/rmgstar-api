const express = require('express');
const router = express.Router();
const Role = require('../../models/Role');

// System default roles kept in code for safety
const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full access to all features',
    permissions: ['*'],
    isSystemDefault: true
  },
  {
    name: 'employee',
    description: 'Internal staff with extended management access',
    permissions: ['courses:read', 'courses:write', 'users:read', 'jobs:write', 'library:write'],
    isSystemDefault: true
  },
  {
    name: 'instructor',
    description: 'Can manage own courses and content',
    permissions: ['courses:read', 'courses:write'],
    isSystemDefault: true
  },
  {
    name: 'student',
    description: 'Can browse and enroll',
    permissions: ['courses:read'],
    isSystemDefault: true
  }
];

// Get roles (system + custom)
router.get('/', async (req, res) => {
  try {
    const customRoles = await Role.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: {
        roles: [...DEFAULT_ROLES, ...customRoles.map(r => r.toObject())]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

// Create custom role
router.post('/', async (req, res) => {
  try {
    const { name, permissions = [], description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const lowerName = name.trim().toLowerCase();
    if (DEFAULT_ROLES.find(r => r.name === lowerName)) {
      return res.status(400).json({ success: false, message: 'This role name is reserved' });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one permission is required' });
    }

    const existing = await Role.findOne({ name: lowerName });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role already exists' });
    }

    const role = await Role.create({
      name: lowerName,
      description,
      permissions,
      isSystemDefault: false
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
});

module.exports = router;

