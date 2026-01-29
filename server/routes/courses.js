const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const CourseLesson = require('../models/CourseLesson');
const LessonProgress = require('../models/LessonProgress');
const Certificate = require('../models/Certificate');
const { authenticate } = require('../middleware/auth');

// Get all courses (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, level } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (level) query.level = level;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const courses = await Course.find(query)
      .populate('trainerId', 'name email avatar title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
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
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
});

// Get single course by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('trainerId', 'name email avatar title')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get batches for this course
    const batches = await Batch.find({ courseId: course._id })
      .populate('trainerId', 'name email avatar')
      .sort({ startDate: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        course,
        batches
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
});

// Get course content for enrolled students
router.get('/:slug/player', authenticate, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('trainerId', 'name email avatar')
      .select('title slug thumbnailImage trainerId courseModules');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled and payment is paid
    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    const enrollment = enrollments.find(e => 
      e.batchId && e.batchId.courseId && e.batchId.courseId._id.toString() === course._id.toString()
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled and payment must be confirmed to access course content'
      });
    }

    // Get course lessons from CourseLesson collection
    let lessons = await CourseLesson.find({
      courseId: course._id,
      isActive: true
    }).sort({ moduleOrder: 1, lessonOrder: 1 });

    // If no lessons in CourseLesson collection, use courseModules from Course model
    if (!lessons || lessons.length === 0) {
      console.log('No lessons in CourseLesson collection, using courseModules from Course model');
      if (course.courseModules && course.courseModules.length > 0) {
        // Convert courseModules to lessons format
        lessons = [];
        course.courseModules.forEach((module, moduleIndex) => {
          if (module.lessons && module.lessons.length > 0) {
            module.lessons.forEach((lesson, lessonIndex) => {
              lessons.push({
                moduleTitle: module.title || `Module ${moduleIndex + 1}`,
                moduleOrder: moduleIndex,
                lessonTitle: lesson.title || `Lesson ${lessonIndex + 1}`,
                lessonOrder: lessonIndex,
                type: lesson.type || 'video',
                videoUrl: lesson.videoUrl || '',
                videoDuration: lesson.videoDuration || 0,
                content: lesson.content || '',
                isFreePreview: lesson.isFreePreview || false,
                resources: lesson.resources || [],
                _id: `temp-${moduleIndex}-${lessonIndex}` // Temporary ID
              });
            });
          }
        });
      }
    }

    // Group lessons by module
    const modules = lessons.reduce((acc, lesson) => {
      const moduleKey = lesson.moduleTitle;
      if (!acc[moduleKey]) {
        acc[moduleKey] = {
          title: lesson.moduleTitle,
          order: lesson.moduleOrder,
          lessons: []
        };
      }
      acc[moduleKey].lessons.push({
        _id: lesson._id,
        title: lesson.lessonTitle,
        type: lesson.type,
        videoUrl: lesson.videoUrl,
        videoDuration: lesson.videoDuration,
        content: lesson.content,
        isFreePreview: lesson.isFreePreview,
        resources: lesson.resources,
        order: lesson.lessonOrder
      });
      return acc;
    }, {});

    const modulesArray = Object.values(modules).sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      data: {
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          thumbnailImage: course.thumbnailImage,
          trainerId: course.trainerId
        },
        modules: modulesArray
      }
    });
  } catch (error) {
    console.error('Error fetching course content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course content',
      error: error.message
    });
  }
});

// Check enrollment/access status for a course (AUTH)
router.get('/:slug/enrollment-status', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({ slug }).select('_id');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate({
        path: 'batchId',
        select: 'courseId',
        populate: { path: 'courseId', select: '_id' }
      })
      .sort({ createdAt: -1 });

    const courseEnrollments = enrollments.filter(e =>
      e.batchId && e.batchId.courseId && e.batchId.courseId._id.toString() === course._id.toString()
    );

    const latest = courseEnrollments[0] || null;
    const enrolled = courseEnrollments.length > 0;
    const canAccess = courseEnrollments.some(e => e.paymentStatus === 'paid');

    return res.json({
      success: true,
      data: {
        enrolled,
        canAccess,
        paymentStatus: latest?.paymentStatus || null,
        enrollmentId: latest?._id || null,
        batchId: latest?.batchId?._id || null,
      }
    });
  } catch (error) {
    console.error('Error fetching enrollment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment status',
      error: error.message
    });
  }
});

// Get single lesson
router.get('/lessons/:lessonId', authenticate, async (req, res) => {
  try {
    const lesson = await CourseLesson.findById(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check enrollment
    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    const enrollment = enrollments.find(e => 
      e.batchId && e.batchId.courseId && e.batchId.courseId._id.toString() === lesson.courseId.toString()
    );

    if (!enrollment && !lesson.isFreePreview) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled to access this lesson'
      });
    }

    res.json({
      success: true,
      data: { lesson }
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson',
      error: error.message
    });
  }
});

// Get course progress
router.get('/:slug/progress', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Find course by slug
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check enrollment
    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    const enrollment = enrollments.find(e => 
      e.batchId && e.batchId.courseId && e.batchId.courseId._id.toString() === course._id.toString()
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled and payment confirmed'
      });
    }

    // Get progress
    const CourseProgress = require('../models/CourseProgress');
    let progress = await CourseProgress.findOne({
      studentId: req.user._id,
      courseId: course._id,
      enrollmentId: enrollment._id
    });

    if (!progress) {
      // Create initial progress
      progress = new CourseProgress({
        studentId: req.user._id,
        courseId: course._id,
        enrollmentId: enrollment._id
      });
      await progress.save();
    }

    // Calculate completion
    await progress.calculateCompletion();

    // Get completed lesson IDs
    const completedLessonIds = progress.completedLessons.map((l) => l.lessonId.toString());

    res.json({
      success: true,
      data: {
        progress: progress, // Return full progress object
        completedLessons: progress.completedLessons, // Also return completed lessons array
        completedLessonIds: completedLessonIds, // For easy checking
        completionPercentage: progress.completionPercentage || 0,
        isCompleted: progress.completionPercentage >= 100
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message
    });
  }
});

// Mark lesson as complete
router.post('/:slug/lessons/:lessonId/complete', authenticate, async (req, res) => {
  try {
    const { slug, lessonId } = req.params;
    const { watchedDuration = 0, totalDuration = 0 } = req.body;
    
    // Find course by slug
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check enrollment
    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    const enrollment = enrollments.find(e => 
      e.batchId && e.batchId.courseId && e.batchId.courseId._id.toString() === course._id.toString()
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled and payment confirmed'
      });
    }

    // Use progress route logic
    const CourseProgress = require('../models/CourseProgress');
    
    // Get or create progress
    let progress = await CourseProgress.findOne({
      studentId: req.user._id,
      courseId: course._id,
      enrollmentId: enrollment._id
    });

    if (!progress) {
      progress = new CourseProgress({
        studentId: req.user._id,
        courseId: course._id,
        enrollmentId: enrollment._id
      });
    }

    // Check if already completed
    const alreadyCompleted = progress.completedLessons.some(
      lesson => lesson.lessonId === lessonId
    );

    if (!alreadyCompleted) {
      progress.completedLessons.push({
        lessonId,
        watchTime: watchedDuration,
        completedAt: new Date()
      });
      progress.lastAccessedAt = new Date();
      await progress.save();
    }

    // Recalculate completion
    await progress.calculateCompletion();

    // Auto-generate certificate if 100% completed
    let certificateGenerated = false;
    if (progress.completionPercentage >= 100) {
      try {
        const Certificate = require('../models/Certificate');
        const CertificateTemplate = require('../models/CertificateTemplate');
        
        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
          studentId: req.user._id,
          courseId: course._id,
          status: 'active'
        });

        if (!existingCertificate) {
          // Get course and student details
          const courseWithTrainer = await Course.findById(course._id).populate('trainerId', 'name title');
          const student = await require('../models/User').findById(req.user._id);
          
          if (courseWithTrainer && student) {
            // Get default template
            let template = await CertificateTemplate.findOne({ isDefault: true });
            if (!template) {
              // Create default template if none exists
              template = new CertificateTemplate({
                name: 'Default Template',
                isDefault: true,
                backgroundColor: '#ffffff',
                backgroundImage: '',
                logoUrl: ''
              });
              await template.save();
            }

            // Generate unique verification number
            const generateUniqueVerificationNumber = async () => {
              let isUnique = false;
              let attempts = 0;
              const maxAttempts = 10;
              let verificationNumber = '';
              
              while (!isUnique && attempts < maxAttempts) {
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                verificationNumber = `CERT-${dateStr}-${random}`;
                
                const existing = await Certificate.findOne({ verificationNumber });
                if (!existing) {
                  isUnique = true;
                }
                attempts++;
              }
              
              return verificationNumber || `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            };

            const verificationNumber = await generateUniqueVerificationNumber();

            // Create certificate
            const certificate = new Certificate({
              studentId: req.user._id,
              courseId: course._id,
              batchId: enrollment?.batchId?._id || null,
              studentName: student.name || student.email,
              courseName: courseWithTrainer.title,
              completionDate: progress.completedAt || new Date(),
              verificationNumber: verificationNumber,
              templateId: template._id,
              issuerName: courseWithTrainer.trainerId ? courseWithTrainer.trainerId.name : 'Admin',
              issuerTitle: courseWithTrainer.trainerId ? courseWithTrainer.trainerId.title : 'Instructor',
              issueDate: new Date(),
              status: 'active',
              isManual: false
            });

            await certificate.save();
            certificateGenerated = true;
            console.log('✅ Certificate auto-generated:', certificate._id);
          }
        }
      } catch (certError) {
        console.error('❌ Error generating certificate:', certError);
        // Don't fail the request if certificate generation fails
      }
    }

    res.json({
      success: true,
      data: {
        progress,
        completionPercentage: progress.completionPercentage,
        isCompleted: progress.completionPercentage >= 100,
        certificateGenerated: certificateGenerated
      }
    });
  } catch (error) {
    console.error('Error marking lesson complete:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark lesson as complete',
      error: error.message
    });
  }
});

module.exports = router;
