const express = require('express');
const router = express.Router();
const JobPost = require('../models/JobPost');
const { optionalAuth } = require('../middleware/auth');

// Get all jobs
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default jobs');
      const defaultJobs = [
        {
          _id: '1',
          title: 'Production Manager',
          companyName: 'ABC Garments Ltd.',
          location: 'Dhaka',
          category: 'Production',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 50000 },
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'Bachelor degree in relevant field. Minimum 3 years experience in production management.'
        },
        {
          _id: '2',
          title: 'Quality Control Officer',
          companyName: 'XYZ Textiles',
          location: 'Gazipur',
          category: 'Quality Control',
          type: 'Full-time',
          salaryRange: { min: 25000, max: 40000 },
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          experience: '2-3 years',
          requirements: 'Diploma or Bachelor degree in Textile Engineering. Strong attention to detail.'
        },
        {
          _id: '3',
          title: 'Merchandiser',
          companyName: 'Fashion House BD',
          location: 'Dhaka',
          category: 'Merchandising',
          type: 'Full-time',
          salaryRange: { min: 35000, max: 55000 },
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          experience: '4-6 years',
          requirements: 'BBA/MBA in relevant field. Excellent communication skills.'
        },
        {
          _id: '4',
          title: 'Garments Production Supervisor',
          companyName: 'RMG Textiles Ltd.',
          location: 'Ashulia',
          category: 'Garments',
          type: 'Full-time',
          salaryRange: { min: 28000, max: 45000 },
          deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          experience: '2-4 years',
          requirements: 'Diploma in Garments Technology. Experience in production line management.'
        },
        {
          _id: '5',
          title: 'Retail Store Manager',
          companyName: 'Fashion Retail Co.',
          location: 'Mirpur',
          category: 'Retail Brands',
          type: 'Full-time',
          salaryRange: { min: 32000, max: 50000 },
          deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'Bachelor degree in Business Administration. Strong leadership skills.'
        },
        {
          _id: '6',
          title: 'Buying House Executive',
          companyName: 'Global Sourcing Ltd.',
          location: 'Dhaka',
          category: 'Buying House',
          type: 'Full-time',
          salaryRange: { min: 40000, max: 60000 },
          deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
          experience: '5-7 years',
          requirements: 'MBA in relevant field. Experience in international sourcing.'
        },
        {
          _id: '7',
          title: 'Textile Engineer',
          companyName: 'Modern Textiles',
          location: 'Gazipur',
          category: 'Textile',
          type: 'Full-time',
          salaryRange: { min: 35000, max: 55000 },
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'BSc in Textile Engineering. Knowledge of textile machinery.'
        },
        {
          _id: '8',
          title: 'Washing Plant Manager',
          companyName: 'Clean Wash Industries',
          location: 'Tongi',
          category: 'Washing',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 48000 },
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          experience: '4-6 years',
          requirements: 'Diploma or Bachelor in Textile Engineering. Experience in washing operations.'
        },
        {
          _id: '9',
          title: 'Fashion Designer',
          companyName: 'Creative Fashion House',
          location: 'Dhaka',
          category: 'Design',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 50000 },
          deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
          experience: '2-4 years',
          requirements: 'Bachelor in Fashion Design. Creative portfolio required.'
        },
        {
          _id: '10',
          title: 'Production Assistant',
          companyName: 'Garment Solutions',
          location: 'Gazipur',
          category: 'Production',
          type: 'Full-time',
          salaryRange: { min: 20000, max: 30000 },
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          experience: '1-2 years',
          requirements: 'HSC or Diploma. Basic knowledge of production processes.'
        },
        {
          _id: '11',
          title: 'Merchandising Executive',
          companyName: 'Export Garments Ltd.',
          location: 'Ashulia',
          category: 'Merchandising',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 45000 },
          deadline: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
          experience: '2-3 years',
          requirements: 'BBA in relevant field. Good English communication skills.'
        },
        {
          _id: '12',
          title: 'QC Inspector',
          companyName: 'Quality First Textiles',
          location: 'Mirpur',
          category: 'Quality Control',
          type: 'Full-time',
          salaryRange: { min: 22000, max: 35000 },
          deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          experience: '1-3 years',
          requirements: 'HSC or Diploma. Attention to detail and quality standards.'
        }
      ];
      
      const { category, location, search, limit = 12 } = req.query;
      
      // Apply filters to dummy data
      let filteredJobs = [...defaultJobs];
      
      if (category && category !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.category === category);
      }
      
      if (location && location !== 'all') {
        filteredJobs = filteredJobs.filter(job => 
          job.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredJobs = filteredJobs.filter(job =>
          job.title.toLowerCase().includes(searchLower) ||
          job.companyName.toLowerCase().includes(searchLower) ||
          job.requirements.toLowerCase().includes(searchLower)
        );
      }
      
      const jobs = filteredJobs.slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: filteredJobs.length,
            pages: Math.ceil(filteredJobs.length / parseInt(limit))
          }
        }
      });
    }

    const {
      category,
      location,
      type,
      search,
      page = 1,
      limit = 12
    } = req.query;

    console.log('📋 Jobs API called with query:', req.query);

    const query = { isActive: true };

    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter out expired jobs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query.deadline = { $gte: today };

    console.log('🔍 Query:', JSON.stringify(query, null, 2));

    const JobCompany = require('../models/JobCompany');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate('employerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Populate company logos and descriptions for all jobs
    for (let job of jobs) {
      if (job.companyId) {
        const company = await JobCompany.findById(job.companyId);
        if (company) {
          if (company.logo) {
            job.companyLogo = company.logo;
          }
          if (company.description) {
            job.companyDescription = company.description;
          }
        }
      }
    }

    const total = await JobPost.countDocuments(query);

    console.log(`✅ Found ${jobs.length} jobs (total: ${total})`);

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
    console.error('❌ Error fetching jobs:', error);
    console.error('Error stack:', error.stack);
    
    // Check if it's a database connection error
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default jobs');
      const defaultJobs = [
        {
          _id: '1',
          title: 'Production Manager',
          companyName: 'ABC Garments Ltd.',
          location: 'Dhaka',
          category: 'Production',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 50000 },
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'Bachelor degree in relevant field. Minimum 3 years experience in production management.'
        },
        {
          _id: '2',
          title: 'Quality Control Officer',
          companyName: 'XYZ Textiles',
          location: 'Gazipur',
          category: 'Quality Control',
          type: 'Full-time',
          salaryRange: { min: 25000, max: 40000 },
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          experience: '2-3 years',
          requirements: 'Diploma or Bachelor degree in Textile Engineering. Strong attention to detail.'
        },
        {
          _id: '3',
          title: 'Merchandiser',
          companyName: 'Fashion House BD',
          location: 'Dhaka',
          category: 'Merchandising',
          type: 'Full-time',
          salaryRange: { min: 35000, max: 55000 },
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          experience: '4-6 years',
          requirements: 'BBA/MBA in relevant field. Excellent communication skills.'
        },
        {
          _id: '4',
          title: 'Garments Production Supervisor',
          companyName: 'RMG Textiles Ltd.',
          location: 'Ashulia',
          category: 'Garments',
          type: 'Full-time',
          salaryRange: { min: 28000, max: 45000 },
          deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          experience: '2-4 years',
          requirements: 'Diploma in Garments Technology. Experience in production line management.'
        },
        {
          _id: '5',
          title: 'Retail Store Manager',
          companyName: 'Fashion Retail Co.',
          location: 'Mirpur',
          category: 'Retail Brands',
          type: 'Full-time',
          salaryRange: { min: 32000, max: 50000 },
          deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'Bachelor degree in Business Administration. Strong leadership skills.'
        },
        {
          _id: '6',
          title: 'Buying House Executive',
          companyName: 'Global Sourcing Ltd.',
          location: 'Dhaka',
          category: 'Buying House',
          type: 'Full-time',
          salaryRange: { min: 40000, max: 60000 },
          deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
          experience: '5-7 years',
          requirements: 'MBA in relevant field. Experience in international sourcing.'
        },
        {
          _id: '7',
          title: 'Textile Engineer',
          companyName: 'Modern Textiles',
          location: 'Gazipur',
          category: 'Textile',
          type: 'Full-time',
          salaryRange: { min: 35000, max: 55000 },
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          experience: '3-5 years',
          requirements: 'BSc in Textile Engineering. Knowledge of textile machinery.'
        },
        {
          _id: '8',
          title: 'Washing Plant Manager',
          companyName: 'Clean Wash Industries',
          location: 'Tongi',
          category: 'Washing',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 48000 },
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          experience: '4-6 years',
          requirements: 'Diploma or Bachelor in Textile Engineering. Experience in washing operations.'
        },
        {
          _id: '9',
          title: 'Fashion Designer',
          companyName: 'Creative Fashion House',
          location: 'Dhaka',
          category: 'Design',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 50000 },
          deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
          experience: '2-4 years',
          requirements: 'Bachelor in Fashion Design. Creative portfolio required.'
        },
        {
          _id: '10',
          title: 'Production Assistant',
          companyName: 'Garment Solutions',
          location: 'Gazipur',
          category: 'Production',
          type: 'Full-time',
          salaryRange: { min: 20000, max: 30000 },
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          experience: '1-2 years',
          requirements: 'HSC or Diploma. Basic knowledge of production processes.'
        },
        {
          _id: '11',
          title: 'Merchandising Executive',
          companyName: 'Export Garments Ltd.',
          location: 'Ashulia',
          category: 'Merchandising',
          type: 'Full-time',
          salaryRange: { min: 30000, max: 45000 },
          deadline: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
          experience: '2-3 years',
          requirements: 'BBA in relevant field. Good English communication skills.'
        },
        {
          _id: '12',
          title: 'QC Inspector',
          companyName: 'Quality First Textiles',
          location: 'Mirpur',
          category: 'Quality Control',
          type: 'Full-time',
          salaryRange: { min: 22000, max: 35000 },
          deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          experience: '1-3 years',
          requirements: 'HSC or Diploma. Attention to detail and quality standards.'
        }
      ];
      
      const { category, location, search, limit = 12 } = req.query;
      
      // Apply filters to dummy data
      let filteredJobs = [...defaultJobs];
      
      if (category && category !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.category === category);
      }
      
      if (location && location !== 'all') {
        filteredJobs = filteredJobs.filter(job => 
          job.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredJobs = filteredJobs.filter(job =>
          job.title.toLowerCase().includes(searchLower) ||
          job.companyName.toLowerCase().includes(searchLower) ||
          job.requirements.toLowerCase().includes(searchLower)
        );
      }
      
      const jobs = filteredJobs.slice(0, parseInt(limit));
      
      return res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: filteredJobs.length,
            pages: Math.ceil(filteredJobs.length / parseInt(limit))
          }
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// Get single job
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const JobCompany = require('../models/JobCompany');
    const job = await JobPost.findById(req.params.id)
      .populate('employerId', 'name email');

    if (!job || !job.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Populate company logo and description if companyId exists
    if (job.companyId) {
      console.log('🔍 Populating company for job:', job._id, 'companyId:', job.companyId);
      const company = await JobCompany.findById(job.companyId);
      if (company) {
        console.log('✅ Company found:', {
          name: company.name,
          hasLogo: !!company.logo,
          hasDescription: !!company.description,
          logo: company.logo,
          description: company.description?.substring(0, 50) + '...'
        });
        if (company.logo) {
          job.companyLogo = company.logo;
        }
        if (company.description) {
          job.companyDescription = company.description;
        }
      } else {
        console.log('❌ Company not found for companyId:', job.companyId);
      }
    } else {
      console.log('⚠️ No companyId for job:', job._id);
    }

    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

module.exports = router;

