const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');

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

// Student submit blog post (requires authentication)
router.post('/submit', authenticate, authorize('student'), async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, thumbnail } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await Post.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A post with this title already exists'
      });
    }

    const post = new Post({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      category,
      tags: Array.isArray(tags) ? tags : [],
      thumbnail: thumbnail || '',
      authorId: req.user._id,
      status: 'pending' // Student submissions require admin approval
    });

    await post.save();

    res.json({
      success: true,
      message: 'Blog post submitted successfully. Waiting for admin approval.',
      data: { post }
    });
  } catch (error) {
    console.error('Error submitting blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit blog post',
      error: error.message
    });
  }
});

// Get user's blog posts
router.get('/user/my-posts', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-content')
      .populate('authorId', 'name avatar');

    res.json({
      success: true,
      data: { posts }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts',
      error: error.message
    });
  }
});

module.exports = router;

