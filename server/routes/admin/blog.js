const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const { slugify } = require('../../utils/slugify');

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await Post.find(query)
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
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
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('authorId', 'name email');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, data: { post } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

// Create post
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    data.slug = slugify(data.title);
    data.authorId = req.user._id;

    // Ensure unique slug
    let slug = data.slug;
    let counter = 1;
    while (await Post.findOne({ slug })) {
      slug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = slug;

    // If publishing, set publishedAt
    if (data.status === 'published' && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    const post = await Post.create(data);

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    
    if (data.title) {
      const post = await Post.findById(req.params.id);
      if (post && post.title !== data.title) {
        data.slug = slugify(data.title);
        let slug = data.slug;
        let counter = 1;
        while (await Post.findOne({ slug, _id: { $ne: req.params.id } })) {
          slug = `${data.slug}-${counter}`;
          counter++;
        }
        data.slug = slug;
      }
    }

    // If publishing for first time, set publishedAt
    if (data.status === 'published') {
      const post = await Post.findById(req.params.id);
      if (post && post.status !== 'published' && !data.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
});

// Duplicate post
router.post('/:id/duplicate', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const original = post.toObject();
    delete original._id;
    delete original.slug;
    delete original.createdAt;
    delete original.updatedAt;

    const baseTitle = (original.title || 'Post').trim();
    const match = baseTitle.match(/^(.*?)(?:\s+(\d+))?$/);
    const tBase = (match?.[1] || baseTitle).trim();
    const tNum = match?.[2] ? parseInt(match[2], 10) : 1;
    const newTitle = `${tBase} ${Math.max(2, tNum + 1)}`;

    const data = {
      ...original,
      title: newTitle,
      status: 'draft',
      publishedAt: null,
      views: 0,
      authorId: req.user?._id || original.authorId,
    };

    data.slug = slugify(data.title);
    let slug = data.slug;
    let counter = 1;
    while (await Post.findOne({ slug })) {
      slug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = slug;

    const created = await Post.create(data);
    return res.status(201).json({
      success: true,
      message: 'Post duplicated successfully',
      data: { post: created }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate post',
      error: error.message
    });
  }
});

module.exports = router;

