const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { authenticate, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|jpg|jpeg|png|gif|webp|svg/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, XLS, PPT, TXT, ZIP, RAR, Images'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (process.env.UPLOAD_MAX_DOC_MB || 50) * 1024 * 1024
  }
});

// Get all documents (public, with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      search,
      days,
      sort = 'desc', // 'asc' or 'desc'
      page = 1,
      limit = 20
    } = req.query;

    const query = { status: 'approved' };

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    if (days) {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum) && daysNum > 0) {
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - daysNum);
        query.publishDate = { $gte: dateFilter };
      }
    }

    const sortOrder = sort === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'name email')
        .sort({ publishDate: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
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
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

// Get latest documents for homepage
router.get('/latest', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const documents = await Document.find({ status: 'approved' })
      .populate('uploadedBy', 'name email')
      .sort({ publishDate: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Error fetching latest documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest documents',
      error: error.message
    });
  }
});

// Get single document
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const document = await Document.findOne({ slug: req.params.slug })
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Increment views
    document.views += 1;
    await document.save();

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
});

// Download document (increment download count)
router.get('/:slug/download', optionalAuth, async (req, res) => {
  try {
    const document = await Document.findOne({ slug: req.params.slug });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (document.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Document not available for download'
      });
    }

    // Increment downloads
    document.downloads += 1;
    await document.save();

    // Redirect to file URL or serve file
    if (document.fileUrl.startsWith('http')) {
      return res.redirect(document.fileUrl);
    }

    const filePath = path.join(__dirname, '../uploads/documents', path.basename(document.fileUrl));
    if (fs.existsSync(filePath)) {
      return res.download(filePath, document.title + path.extname(document.fileUrl));
    }

    res.redirect(document.fileUrl);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
});

// User upload document (requires authentication)
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const { title, description, category, author } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await Document.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A document with this title already exists'
      });
    }

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    let fileType = 'other';
    if (['pdf'].includes(ext)) fileType = 'pdf';
    else if (['xls', 'xlsx'].includes(ext)) fileType = 'excel';
    else if (['doc', 'docx'].includes(ext)) fileType = 'doc';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) fileType = 'image';

    const document = new Document({
      title,
      slug,
      description: description || '',
      category,
      author: author || 'RMG Platform',
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileType,
      fileSize: req.file.size,
      thumbnail: req.file.mimetype.startsWith('image/') ? `/uploads/documents/${req.file.filename}` : '',
      status: 'pending',
      uploadedBy: req.user._id
    });

    await document.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully. Waiting for admin approval.',
      data: { document }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// Get user's uploaded documents
router.get('/user/my-documents', authenticate, async (req, res) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user documents',
      error: error.message
    });
  }
});

module.exports = router;
