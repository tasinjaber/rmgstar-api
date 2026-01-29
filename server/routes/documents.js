const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { slugify } = require('../utils/slugify');

const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_DOC_MB = parseInt(process.env.UPLOAD_MAX_DOC_MB || '50', 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'document-' + uniqueSuffix + ext);
  }
});

// Allow many document types (pdf, office, images, etc.)
const anyFileFilter = (req, file, cb) => cb(null, true);

const upload = multer({
  storage,
  limits: { fileSize: MAX_DOC_MB * 1024 * 1024 },
  fileFilter: anyFileFilter
});

// Public list (only published)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      days,
      sort = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = { status: 'published' };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (days && ['7', '30'].includes(String(days))) {
      const since = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);
      query.publishDate = { $gte: since };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDir = sort === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ publishDate: sortDir })
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '8', 10);
    const documents = await Document.find({ status: 'published' })
      .sort({ publishDate: -1 })
      .limit(limit);
    res.json({ success: true, data: { documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch latest documents', error: error.message });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: { documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your documents', error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const doc = await Document.findOne({ slug: req.params.slug, status: 'published' });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { document: doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch document', error: error.message });
  }
});

// Student/user upload -> pending approval
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { title, description = '', category = 'General', author = '' } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;
    while (await Document.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const doc = await Document.create({
      title,
      slug,
      description,
      category,
      author: author || req.user?.name || 'Student',
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'pending',
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Document submitted for approval', data: { document: doc } });
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `File too large. Max ${MAX_DOC_MB}MB.` });
    }
    res.status(500).json({ success: false, message: 'Failed to upload document', error: error.message });
  }
});

module.exports = router;


