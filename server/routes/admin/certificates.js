const express = require('express');
const router = express.Router();
const Certificate = require('../../models/Certificate');
const CertificateTemplate = require('../../models/CertificateTemplate');
const Course = require('../../models/Course');
const Batch = require('../../models/Batch');
const User = require('../../models/User');
const Enrollment = require('../../models/Enrollment');

// Get all certificates
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status, studentId, courseId } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } },
        { verificationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email avatar')
      .populate('courseId', 'title thumbnailImage')
      .populate('batchId', 'startDate endDate')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    res.json({
      success: true,
      data: {
        certificates,
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
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
});

// Get certificate categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Certificate.distinct('category');
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get single certificate
router.get('/:id', async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('studentId', 'name email avatar')
      .populate('courseId', 'title thumbnailImage description slug')
      .populate('batchId', 'startDate endDate')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl')
      .lean();

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, data: { certificate } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
});

// Verify certificate by verification number
router.get('/verify/:verificationNumber', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      verificationNumber: req.params.verificationNumber 
    })
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found or invalid verification number' 
      });
    }

    if (certificate.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Certificate is ${certificate.status}`
      });
    }

    res.json({ success: true, data: { certificate } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
});

// Create certificate manually
router.post('/', async (req, res) => {
  try {
    const { studentId, courseId, batchId, studentName, courseName, completionDate, templateId, issuerName, issuerTitle } = req.body;

    // Validate required fields
    if (!studentId || !studentName || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, student name, and course name are required'
      });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if course exists (if provided)
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Check if batch exists (if provided)
    if (batchId) {
      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }
    }

    // Always use default template
    let template = await CertificateTemplate.findOne({ isDefault: true, isActive: true });
    if (!template) {
      // Try to find any active template
      template = await CertificateTemplate.findOne({ isActive: true });
      if (!template) {
        return res.status(400).json({
          success: false,
          message: 'No certificate template found. Please create a default template in Settings > Certificates > Settings.'
        });
      }
    }

    // Validate completion date
    let validCompletionDate = new Date();
    if (completionDate) {
      const parsedDate = new Date(completionDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid completion date format'
        });
      }
      validCompletionDate = parsedDate;
    }

    // Generate unique verification number
    let verificationNumber = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      verificationNumber = `CERT-${dateStr}-${random}`;
      
      // Check if this verification number already exists
      const existing = await Certificate.findOne({ verificationNumber });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    // Fallback if still not unique
    if (!verificationNumber) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      verificationNumber = `CERT-${timestamp}-${random}`;
    }

    const certificate = await Certificate.create({
      studentId,
      courseId: courseId || null,
      batchId: batchId || null,
      studentName: studentName.trim(),
      courseName: courseName.trim(),
      completionDate: validCompletionDate,
      verificationNumber,
      templateId: template ? template._id : null,
      issuerName: (issuerName || '').trim(),
      issuerTitle: (issuerTitle || '').trim(),
      isManual: true,
      status: 'active'
    });

    const populated = await Certificate.findById(certificate._id)
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl');

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: { certificate: populated }
    });
  } catch (error) {
    console.error('Certificate creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create certificate',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Auto-generate certificate for course completion
router.post('/generate', async (req, res) => {
  try {
    const { enrollmentId, courseId, studentId, completionDate } = req.body;

    if (!enrollmentId && (!courseId || !studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Either enrollmentId or both courseId and studentId are required'
      });
    }

    let enrollment = null;
    let course = null;
    let student = null;
    let batch = null;

    if (enrollmentId) {
      enrollment = await Enrollment.findById(enrollmentId)
        .populate('studentId', 'name email')
        .populate({
          path: 'batchId',
          populate: { path: 'courseId' }
        });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      student = enrollment.studentId;
      batch = enrollment.batchId;
      course = batch.courseId;
    } else {
      course = await Course.findById(courseId);
      student = await User.findById(studentId);

      if (!course || !student) {
        return res.status(404).json({
          success: false,
          message: 'Course or student not found'
        });
      }
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      studentId: student._id,
      courseId: course._id,
      status: 'active'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this course completion',
        data: { certificate: existing }
      });
    }

    // Get default template
    const template = await CertificateTemplate.findOne({ isDefault: true, isActive: true });

    // Get instructor/trainer name
    let issuerName = '';
    let issuerTitle = 'Instructor';
    if (course.certificateInfo) {
      issuerName = course.certificateInfo.issuerName || '';
      issuerTitle = course.certificateInfo.issuerTitle || 'Instructor';
    } else if (batch && batch.trainerId) {
      const trainer = await User.findById(batch.trainerId);
      if (trainer) {
        issuerName = trainer.name;
        issuerTitle = 'Instructor';
      }
    }

    const certificate = await Certificate.create({
      studentId: student._id,
      courseId: course._id,
      batchId: batch ? batch._id : null,
      studentName: student.name,
      courseName: course.title,
      completionDate: completionDate ? new Date(completionDate) : new Date(),
      templateId: template ? template._id : null,
      issuerName,
      issuerTitle,
      isManual: false,
      status: 'active'
    });

    const populated = await Certificate.findById(certificate._id)
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl');

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: { certificate: populated }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error.message
    });
  }
});

// Update certificate
router.put('/:id', async (req, res) => {
  try {
    const { studentName, courseName, completionDate, status, templateId, issuerName, issuerTitle } = req.body;

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const updateData = {};
    if (studentName) updateData.studentName = studentName;
    if (courseName) updateData.courseName = courseName;
    if (completionDate) updateData.completionDate = new Date(completionDate);
    if (status) updateData.status = status;
    if (templateId) updateData.templateId = templateId;
    if (issuerName !== undefined) updateData.issuerName = issuerName;
    if (issuerTitle !== undefined) updateData.issuerTitle = issuerTitle;

    const updated = await Certificate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('templateId', 'name backgroundImage backgroundColor logoUrl');

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      data: { certificate: updated }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update certificate',
      error: error.message
    });
  }
});

// Delete certificate
router.delete('/:id', async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete certificate',
      error: error.message
    });
  }
});

// ========== Certificate Template Routes ==========

// Get all templates
router.get('/templates/all', async (req, res) => {
  try {
    const templates = await CertificateTemplate.find({ isActive: true })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: { template } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const template = await CertificateTemplate.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: { template }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default template'
      });
    }

    await CertificateTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

module.exports = router;

