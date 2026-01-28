const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Get all active categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

// Get category by name (for frontend)
router.get('/:name', async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    const category = await Category.findOne({ 
      $or: [
        { name: categoryName },
        { slug: categoryName.toLowerCase().replace(/\s+/g, '-') }
      ],
      isActive: true 
    });
    
    if (!category) {
      // Return default category object if not found
      return res.json({ 
        success: true, 
        data: { 
          category: { 
            name: categoryName, 
            description: '',
            heroBackground: ''
          } 
        } 
      });
    }
    
    res.json({ success: true, data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
});

module.exports = router;

