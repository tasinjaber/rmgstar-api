const express = require('express');
const router = express.Router();
const Stats = require('../models/Stats');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const { requireDB } = require('../middleware/dbCheck');

// Get stats
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default stats');
      return res.json({
        success: true,
        data: {
          stats: {
            totalStudents: 0,
            totalInstructors: 0,
            totalCourses: 0,
            totalBatches: 0,
            totalEnrollments: 0,
            totalPartners: 0
          }
        }
      });
    }

    // Calculate real-time stats
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalInstructors = await User.countDocuments({ role: 'trainer', isActive: true });
    const totalCourses = await Course.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const Enrollment = require('../models/Enrollment');
    const totalEnrollments = await Enrollment.countDocuments();
    const Employer = require('../models/Employer');
    const totalPartners = await Employer.countDocuments();

    // Update stats document
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({});
    }

    stats.totalStudents = totalStudents;
    stats.totalInstructors = totalInstructors;
    stats.totalCourses = totalCourses;
    stats.totalBatches = totalBatches;
    stats.totalEnrollments = totalEnrollments;
    stats.totalPartners = totalPartners;
    await stats.save();

    console.log('📊 Stats fetched:', { totalStudents, totalInstructors, totalCourses, totalBatches });

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    console.error('Error stack:', error.stack);
    // Return default stats instead of 500 error
    res.json({
      success: true,
      data: {
        stats: {
          totalStudents: 0,
          totalInstructors: 0,
          totalCourses: 0,
          totalBatches: 0,
          totalEnrollments: 0,
          totalPartners: 0
        }
      }
    });
  }
});

module.exports = router;

