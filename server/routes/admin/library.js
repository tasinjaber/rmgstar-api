const express = require('express');
const router = express.Router();
const LibraryItem = require('../../models/LibraryItem');
const { slugify } = require('../../utils/slugify');

// Get all library items
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await LibraryItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LibraryItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items,
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
      message: 'Failed to fetch library items',
      error: error.message
    });
  }
});

// Get single library item
router.get('/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Library item not found' });
    }
    res.json({ success: true, data: { item } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library item',
      error: error.message
    });
  }
});

// Create library item
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    data.slug = slugify(data.title);

    // Ensure unique slug
    let slug = data.slug;
    let counter = 1;
    while (await LibraryItem.findOne({ slug })) {
      slug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = slug;

    const item = await LibraryItem.create(data);

    res.status(201).json({
      success: true,
      message: 'Library item created successfully',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create library item',
      error: error.message
    });
  }
});

// Update library item
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    
    if (data.title) {
      const item = await LibraryItem.findById(req.params.id);
      if (item && item.title !== data.title) {
        data.slug = slugify(data.title);
        let slug = data.slug;
        let counter = 1;
        while (await LibraryItem.findOne({ slug, _id: { $ne: req.params.id } })) {
          slug = `${data.slug}-${counter}`;
          counter++;
        }
        data.slug = slug;
      }
    }

    const item = await LibraryItem.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Library item not found'
      });
    }

    res.json({
      success: true,
      message: 'Library item updated successfully',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update library item',
      error: error.message
    });
  }
});

// Delete library item
router.delete('/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Library item not found'
      });
    }

    res.json({
      success: true,
      message: 'Library item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete library item',
      error: error.message
    });
  }
});

module.exports = router;

