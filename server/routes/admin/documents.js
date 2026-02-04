const express = require('express');
const router = express.Router();
const Document = require('../../models/Document');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for admin document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
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
    fileSize: (process.env.UPLOAD_MAX_DOC_MB || 5000) * 1024 * 1024 // 5GB default, or set via env
  }
});

// Get all documents (admin)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      category,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
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

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

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

// Create document (admin)
router.post('/', (req, res, next) => {
  // Set CORS headers before multer processes the request
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
}, upload.single('file'), async (req, res) => {
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
      status: 'approved',
      uploadedBy: req.user._id,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    await document.save();

    res.json({
      success: true,
      message: 'Document created successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
});

// Update document
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, author, publishDate } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (title && title !== document.title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const existing = await Document.findOne({ slug, _id: { $ne: document._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A document with this title already exists'
        });
      }
      document.title = title;
      document.slug = slug;
    }

    if (description !== undefined) document.description = description;
    if (category) document.category = category;
    if (author) document.author = author;
    if (publishDate) document.publishDate = new Date(publishDate);

    await document.save();

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
});

// Approve document
router.post('/:id/approve', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.status = 'approved';
    document.approvedBy = req.user._id;
    document.approvedAt = new Date();
    await document.save();

    res.json({
      success: true,
      message: 'Document approved successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve document',
      error: error.message
    });
  }
});

// Reject document
router.post('/:id/reject', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.status = 'rejected';
    document.approvedBy = req.user._id;
    document.approvedAt = new Date();
    await document.save();

    res.json({
      success: true,
      message: 'Document rejected successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject document',
      error: error.message
    });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file if exists
    if (document.fileUrl && !document.fileUrl.startsWith('http')) {
      const filePath = path.join(__dirname, '../../uploads/documents', path.basename(document.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

module.exports = router;
