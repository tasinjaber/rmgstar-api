const express = require('express');
const router = express.Router();
const JobPost = require('../../models/JobPost');
const JobCompany = require('../../models/JobCompany');
const JobCategory = require('../../models/JobCategory');
const JobSubCategory = require('../../models/JobSubCategory');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate('employerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
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
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id).populate('employerId', 'name email');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: { job } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

// Create job
router.post('/', async (req, res) => {
  try {
    const data = req.body || {};

    // If companyId is provided, hydrate companyName/companyEmail
    if (data.companyId) {
      const company = await JobCompany.findById(data.companyId);
      if (company) {
        data.companyName = company.name;
        data.companyEmail = company.email || '';
      }
    }

    // Hydrate category/subcategory display strings
    if (data.categoryId) {
      const cat = await JobCategory.findById(data.categoryId);
      if (cat) data.category = cat.name;
    }
    if (data.subCategoryId) {
      const sc = await JobSubCategory.findById(data.subCategoryId);
      if (sc) data.subCategory = sc.name;
    }

    // Set default employerId if not provided (optional field now)
    if (!data.employerId) {
      // Use the admin user creating the job as employer
      data.employerId = req.user._id;
    }

    // Ensure required fields have defaults if missing
    if (!data.type && data.employmentStatus) {
      // Map employmentStatus to type enum
      const typeMap = {
        'Full Time': 'Full-time',
        'Part Time': 'Part-time',
        'Contractual': 'Contract',
        'Internship': 'Internship',
        'Freelance': 'Full-time' // Default fallback
      };
      data.type = typeMap[data.employmentStatus] || 'Full-time';
    }

    const job = await JobPost.create(data);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message
    });
  }
});

// Update job
router.put('/:id', async (req, res) => {
  try {
    const data = req.body || {};

    if (data.companyId) {
      const company = await JobCompany.findById(data.companyId);
      if (company) {
        data.companyName = company.name;
        data.companyEmail = company.email || '';
      }
    }
    if (data.categoryId) {
      const cat = await JobCategory.findById(data.categoryId);
      if (cat) data.category = cat.name;
    }
    if (data.subCategoryId) {
      const sc = await JobSubCategory.findById(data.subCategoryId);
      if (sc) data.subCategory = sc.name;
    }

    const job = await JobPost.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const job = await JobPost.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
});

// Duplicate job
router.post('/:id/duplicate', async (req, res) => {
  try {
    const job = await JobPost.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const original = job.toObject();
    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;

    const baseTitle = (original.title || 'Job').trim();
    const match = baseTitle.match(/^(.*?)(?:\s+(\d+))?$/);
    const tBase = (match?.[1] || baseTitle).trim();
    const tNum = match?.[2] ? parseInt(match[2], 10) : 1;
    const newTitle = `${tBase} ${Math.max(2, tNum + 1)}`;

    const data = {
      ...original,
      title: newTitle,
      isActive: true, // Auto activate duplicated jobs
    };

    const created = await JobPost.create(data);
    return res.status(201).json({
      success: true,
      message: 'Job duplicated successfully',
      data: { job: created }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate job',
      error: error.message
    });
  }
});

module.exports = router;

