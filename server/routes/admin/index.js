const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default dashboard data');
      return res.json({
        success: true,
        data: {
          stats: {
            totalStudents: 0,
            totalEnrollments: 0,
            activeCourses: 0,
            openJobs: 0,
            upcomingBatches: 0,
            pendingApplications: 0,
            totalLibraryItems: 0,
            totalBlogPosts: 0,
            totalInstructors: 0
          },
          topCourses: [],
          topStudents: [],
          topBatches: [],
          topJobs: [],
          topEnrollments: [],
          topApplications: [],
          charts: {
            enrollmentTrends: [],
            courseCategories: [],
            enrollmentStatus: []
          }
        }
      });
    }

    const User = require('../../models/User');
    const Course = require('../../models/Course');
    const Batch = require('../../models/Batch');
    const JobPost = require('../../models/JobPost');
    const Enrollment = require('../../models/Enrollment');
    const JobApplication = require('../../models/JobApplication');
    const LibraryItem = require('../../models/LibraryItem');
    const Post = require('../../models/Post');

    // Get counts
    const [
      totalStudents,
      totalEnrollments,
      activeCourses,
      openJobs,
      upcomingBatches,
      pendingApplications,
      totalLibraryItems,
      totalBlogPosts,
      totalInstructors
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Enrollment.countDocuments(),
      Course.countDocuments(),
      JobPost.countDocuments({ isActive: true }),
      Batch.countDocuments({ status: { $in: ['upcoming', 'running'] } }),
      JobApplication.countDocuments({ status: 'submitted' }),
      LibraryItem.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      User.countDocuments({ role: { $in: ['trainer', 'instructor'] }, isActive: true })
    ]);

    // Get top 5 courses (by enrollment count)
    const topCourses = await Course.find()
      .populate('trainerId', 'name email')
      .sort({ 'stats.totalStudents': -1 })
      .limit(5)
      .select('title thumbnailImage stats.totalStudents category price');

    // Get top 5 students (by enrollment count)
    const topStudents = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'studentId',
          as: 'enrollments'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          avatar: 1,
          enrollmentCount: { $size: '$enrollments' }
        }
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 5 }
    ]);

    // Get top 5 batches (by enrollment count)
    const topBatches = await Batch.find()
      .populate('courseId', 'title thumbnailImage')
      .populate('trainerId', 'name email')
      .sort({ enrolledCount: -1 })
      .limit(5)
      .select('courseId trainerId startDate endDate enrolledCount seatLimit status mode');

    // Get top 5 jobs (by application count)
    const topJobs = await JobPost.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'jobapplications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications'
        }
      },
      {
        $project: {
          title: 1,
          companyName: 1,
          location: 1,
          category: 1,
          deadline: 1,
          applicationCount: { $size: '$applications' }
        }
      },
      { $sort: { applicationCount: -1 } },
      { $limit: 5 }
    ]);

    // Get top 5 enrollments (recent)
    const topEnrollments = await Enrollment.find()
      .populate('studentId', 'name email')
      .populate({
        path: 'batchId',
        populate: { path: 'courseId', select: 'title' }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentId batchId paymentStatus enrolledAt amountPaid');

    // Get top 5 applications (recent)
    const topApplications = await JobApplication.find()
      .populate('applicantId', 'name email')
      .populate('jobId', 'title companyName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('applicantId jobId status createdAt');

    // Get enrollment trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const enrollmentTrends = await Enrollment.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get course category distribution
    const courseCategories = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get enrollment status distribution
    const enrollmentStatus = await Enrollment.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalEnrollments,
          activeCourses,
          openJobs,
          upcomingBatches,
          pendingApplications,
          totalLibraryItems,
          totalBlogPosts,
          totalInstructors
        },
        topCourses,
        topStudents,
        topBatches,
        topJobs,
        topEnrollments,
        topApplications,
        charts: {
          enrollmentTrends: enrollmentTrends.map(item => ({
            date: item._id,
            count: item.count
          })),
          courseCategories: courseCategories.map(item => ({
            name: item._id,
            value: item.count
          })),
          enrollmentStatus: enrollmentStatus.map(item => ({
            name: item._id,
            value: item.count
          }))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    console.error('Error stack:', error.stack);
    
    // Check if it's a database connection error
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default dashboard data');
      return res.json({
        success: true,
        data: {
          stats: {
            totalStudents: 0,
            totalEnrollments: 0,
            activeCourses: 0,
            openJobs: 0,
            upcomingBatches: 0,
            pendingApplications: 0,
            totalLibraryItems: 0,
            totalBlogPosts: 0,
            totalInstructors: 0
          },
          topCourses: [],
          topStudents: [],
          topBatches: [],
          topJobs: [],
          topEnrollments: [],
          topApplications: [],
          charts: {
            enrollmentTrends: [],
            courseCategories: [],
            enrollmentStatus: []
          }
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// Mount sub-routes
router.use('/users', require('./users'));
router.use('/courses', require('./courses'));
router.use('/batches', require('./batches'));
router.use('/trainers', require('./trainers'));
router.use('/roles', require('./roles'));
router.use('/enrollments', require('./enrollments'));
router.use('/jobs', require('./jobs'));
router.use('/library', require('./library'));
router.use('/blog', require('./blog'));
router.use('/homepage', require('./homepage'));
router.use('/settings', require('./settings'));
router.use('/upload', require('./upload'));
router.use('/header', require('./header'));
router.use('/categories', require('./categories'));
router.use('/certificates', require('./certificates'));

// Log route loading for debugging
console.log('✅ Admin routes loaded: homepage, settings, upload, header, categories, certificates');

module.exports = router;

