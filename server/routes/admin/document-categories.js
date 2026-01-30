const express = require('express');
const router = express.Router();
const DocumentCategory = require('../../models/DocumentCategory');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await DocumentCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select('-__v');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document categories',
      error: error.message
    });
  }
});

// Get all categories (including inactive for admin)
router.get('/all', async (req, res) => {
  try {
    const categories = await DocumentCategory.find()
      .sort({ order: 1, name: 1 })
      .select('-__v');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching all document categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document categories',
      error: error.message
    });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await DocumentCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Error fetching document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document category',
      error: error.message
    });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, description, order, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await DocumentCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }

    const category = new DocumentCategory({
      name: name.trim(),
      slug,
      description: description || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await category.save();

    res.json({
      success: true,
      message: 'Document category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error creating document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document category',
      error: error.message
    });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, description, order, isActive } = req.body;

    const category = await DocumentCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (name && name.trim() !== category.name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const existing = await DocumentCategory.findOne({ slug, _id: { $ne: category._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists'
        });
      }
      
      category.name = name.trim();
      category.slug = slug;
    }

    if (description !== undefined) category.description = description;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Document category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error updating document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document category',
      error: error.message
    });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const category = await DocumentCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if any documents use this category
    const Document = require('../../models/Document');
    const docCount = await Document.countDocuments({ category: category.name });
    if (docCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${docCount} document(s) are using this category.`
      });
    }

    await DocumentCategory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document category',
      error: error.message
    });
  }
});

module.exports = router;

