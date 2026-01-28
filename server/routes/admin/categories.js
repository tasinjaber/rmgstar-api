const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const Course = require('../../models/Course');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/categories';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    // Get categories from Category model
    const dbCategories = await Category.find().sort({ order: 1, name: 1 });
    
    // Get unique categories from existing courses
    const courseCategories = await Course.distinct('category');
    
    // Create a map of existing category names
    const existingCategoryMap = new Map();
    dbCategories.forEach(cat => {
      existingCategoryMap.set(cat.name, cat);
    });
    
    // Add categories from courses that don't exist in Category model
    const allCategories = [...dbCategories];
    courseCategories.forEach(catName => {
      if (catName && !existingCategoryMap.has(catName)) {
        // Create a temporary category object for display
        allCategories.push({
          _id: `temp-${catName}`,
          name: catName,
          slug: catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: '',
          heroBackground: '',
          isActive: true,
          order: 999,
          isFromCourse: true // Flag to indicate it's from courses
        });
      }
    });
    
    res.json({ success: true, data: { categories: allCategories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

// Get single category by slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
});

// Create category
router.post('/', upload.single('heroBackground'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description, order } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if category with same name or slug exists
    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const categoryData = {
      name,
      slug,
      description: description || '',
      order: order || 0,
      heroBackground: req.file ? `/uploads/categories/${req.file.filename}` : ''
    };

    const category = await Category.create(categoryData);
    res.status(201).json({ success: true, message: 'Category created successfully', data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
});

// Update category
router.put('/:id', upload.single('heroBackground'), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const updateData = {};
    if (req.body.name) {
      updateData.name = req.body.name;
      updateData.slug = req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.order !== undefined) updateData.order = parseInt(req.body.order) || 0;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    
    if (req.file) {
      // Delete old image if exists
      if (category.heroBackground) {
        const oldPath = category.heroBackground.startsWith('/') ? category.heroBackground.substring(1) : category.heroBackground;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.heroBackground = `/uploads/categories/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Category updated successfully', data: { category: updatedCategory } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Delete image if exists
    if (category.heroBackground) {
      const imagePath = category.heroBackground.startsWith('/') ? category.heroBackground.substring(1) : category.heroBackground;
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
});

module.exports = router;

