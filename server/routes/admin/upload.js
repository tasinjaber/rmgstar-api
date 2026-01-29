const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../../models/Media');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const MAX_IMAGE_MB = parseInt(process.env.UPLOAD_MAX_IMAGE_MB || '50', 10);
const MAX_DOC_MB = parseInt(process.env.UPLOAD_MAX_DOC_MB || '50', 10);

// File filter for images only (allow all image/* including svg, avif, heic etc.)
const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed'));
};

// File filter for CV/Documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /pdf|msword|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(file.mimetype);

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

const imageUpload = multer({
  storage: storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: imageFilter
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum size is ${MAX_IMAGE_MB}MB.`
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
    // Handle file filter errors
    if (err.message && err.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

const documentUpload = multer({
  storage: storage,
  limits: { fileSize: MAX_DOC_MB * 1024 * 1024 },
  fileFilter: documentFilter
});

// Upload single image
router.post('/image', imageUpload.single('image'), handleMulterError, async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      filename: req.file?.filename,
      originalName: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      userId: req.user?._id
    });

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('File URL:', fileUrl);
    
    // Save to Media collection
    let media = null;
    try {
      media = new Media({
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        path: fileUrl, // Store relative path for consistency
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: 'image',
        uploadedBy: req.user?._id || null
      });
      await media.save();
      console.log('✅ Media saved to database:', media._id);
    } catch (mediaError) {
      console.error('❌ Error saving media to database:', mediaError);
      console.error('Error stack:', mediaError.stack);
      // Continue even if media save fails - file is still uploaded
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mediaId: media?._id || null
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// Upload CV/Document
router.post('/cv', documentUpload.single('cv'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'CV uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload CV',
      error: error.message
    });
  }
});

// Get all media
router.get('/media', async (req, res) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const media = await Media.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      data: {
        media,
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
      message: 'Failed to fetch media',
      error: error.message
    });
  }
});

// Get single media
router.get('/media/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'name email');
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      data: { media }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media',
      error: error.message
    });
  }
});

// Delete media
router.delete('/media/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, media.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete from database
    await Media.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete media',
      error: error.message
    });
  }
});

module.exports = router;


