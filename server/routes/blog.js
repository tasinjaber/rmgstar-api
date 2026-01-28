const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { optionalAuth } = require('../middleware/auth');

// Get all published posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default blog posts');
      const defaultPosts = [
        {
          _id: '1',
          title: 'Future of RMG Industry in Bangladesh',
          excerpt: 'Exploring the growth and opportunities in the RMG sector',
          thumbnail: '',
          category: 'Industry News',
          tags: ['RMG', 'Bangladesh', 'Industry'],
          publishedAt: new Date(),
          authorId: { name: 'Admin', avatar: '' },
          views: 0
        },
        {
          _id: '2',
          title: 'Quality Control Best Practices',
          excerpt: 'Essential quality control techniques for RMG professionals',
          thumbnail: '',
          category: 'Training',
          tags: ['Quality Control', 'Training'],
          publishedAt: new Date(),
          authorId: { name: 'Admin', avatar: '' },
          views: 0
        },
        {
          _id: '3',
          title: 'Sustainable Fashion Trends',
          excerpt: 'How sustainability is shaping the future of fashion',
          thumbnail: '',
          category: 'Trends',
          tags: ['Sustainability', 'Fashion'],
          publishedAt: new Date(),
          authorId: { name: 'Admin', avatar: '' },
          views: 0
        }
      ];
      
      const { limit = 12 } = req.query;
      const posts = defaultPosts.slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        data: {
          posts,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: posts.length,
            pages: 1
          }
        }
      });
    }

    const {
      category,
      tag,
      search,
      page = 1,
      limit = 12
    } = req.query;

    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await Post.find(query)
      .populate('authorId', 'name avatar')
      .select('-content') // Exclude full content in list
      .sort({ publishedAt: -1 })
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
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      status: 'published'
    })
      .populate('authorId', 'name avatar email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

module.exports = router;

