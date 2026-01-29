const express = require('express');
const router = express.Router();
const JobCategory = require('../../models/JobCategory');
const { slugify } = require('../../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const categories = await JobCategory.find().sort({ name: 1 }).limit(200);
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
    const data = { name: String(name).trim(), slug: slugify(String(name)) };
    const category = await JobCategory.create(data);
    res.status(201).json({ success: true, message: 'Category created', data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await JobCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
});

module.exports = router;


