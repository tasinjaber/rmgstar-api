const express = require('express');
const router = express.Router();
const CourseProgress = require('../models/CourseProgress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const CourseLesson = require('../models/CourseLesson');
const { authenticate, authorize } = require('../middleware/auth');

// Get course progress
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Find enrollment for this specific course
    const enrollments = await Enrollment.find({
      studentId,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    // Find enrollment that matches this course
    const enrollment = enrollments.find(e => 
      e.batchId && 
      e.batchId.courseId && 
      e.batchId.courseId._id.toString() === courseId
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found for this course'
      });
    }

    // Get or create progress
    let progress = await CourseProgress.findOne({
      studentId,
      courseId,
      enrollmentId: enrollment._id
    });

    if (!progress) {
      progress = new CourseProgress({
        studentId,
        courseId,
        enrollmentId: enrollment._id
      });
      await progress.save();
    }

    // Calculate completion
    await progress.calculateCompletion();

    res.json({
      success: true,
      data: {
        progress,
        completionPercentage: progress.completionPercentage,
        completedLessons: progress.completedLessons.length,
        isCompleted: progress.completionPercentage >= 100
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
});

// Mark lesson as completed
router.post('/lesson/complete', authenticate, async (req, res) => {
  try {
    const { courseId, lessonId, watchTime = 0 } = req.body;
    const studentId = req.user._id;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and Lesson ID are required'
      });
    }

    // Find enrollment for this specific course
    const enrollments = await Enrollment.find({
      studentId,
      paymentStatus: 'paid'
    }).populate({
      path: 'batchId',
      select: 'courseId',
      populate: {
        path: 'courseId',
        select: '_id'
      }
    });

    // Find enrollment that matches this course
    const enrollment = enrollments.find(e => 
      e.batchId && 
      e.batchId.courseId && 
      e.batchId.courseId._id.toString() === courseId
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled and payment confirmed'
      });
    }

    // Get or create progress
    let progress = await CourseProgress.findOne({
      studentId,
      courseId,
      enrollmentId: enrollment._id
    });

    if (!progress) {
      progress = new CourseProgress({
        studentId,
        courseId,
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
        watchTime,
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
          studentId: studentId,
          courseId: courseId,
          status: 'active'
        });

        if (!existingCertificate) {
          // Get course and enrollment details
          const course = await Course.findById(courseId).populate('trainerId', 'name title');
          const student = await require('../models/User').findById(studentId);
          
          if (course && student) {
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
              studentId: studentId,
              courseId: courseId,
              batchId: enrollment?.batchId?._id || null,
              studentName: student.name || student.email,
              courseName: course.title,
              completionDate: progress.completedAt || new Date(),
              verificationNumber: verificationNumber,
              templateId: template._id,
              issuerName: course.trainerId ? course.trainerId.name : 'Admin',
              issuerTitle: course.trainerId ? course.trainerId.title : 'Instructor',
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
      message: 'Failed to mark lesson as complete'
    });
  }
});

// Get all progress for student
router.get('/my-progress', authenticate, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user._id;
    
    const progressList = await CourseProgress.find({ studentId })
      .populate('courseId', 'title slug thumbnailImage')
      .populate('enrollmentId', 'paymentStatus')
      .sort({ lastAccessedAt: -1 });

    res.json({
      success: true,
      data: progressList
    });
  } catch (error) {
    console.error('Error fetching progress list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
});

module.exports = router;

