const express = require('express');
const router = express.Router();
const JobSubCategory = require('../../models/JobSubCategory');
const JobCategory = require('../../models/JobCategory');
const { slugify } = require('../../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = {};
    if (categoryId) query.categoryId = categoryId;

    const subCategories = await JobSubCategory.find(query)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ success: true, data: { subCategories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sub-categories', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { categoryId, name } = req.body || {};
    if (!categoryId || !name) {
      return res.status(400).json({ success: false, message: 'categoryId and name are required' });
    }
    const category = await JobCategory.findById(categoryId);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const subCategory = await JobSubCategory.create({
      categoryId,
      name: String(name).trim(),
      slug: slugify(String(name))
    });

    res.status(201).json({ success: true, message: 'Sub-category created', data: { subCategory } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create sub-category', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sc = await JobSubCategory.findByIdAndDelete(req.params.id);
    if (!sc) return res.status(404).json({ success: false, message: 'Sub-category not found' });
    res.json({ success: true, message: 'Sub-category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete sub-category', error: error.message });
  }
});

module.exports = router;


