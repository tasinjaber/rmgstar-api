const express = require('express');
const router = express.Router();

// Get homepage content
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default homepage content');
      return res.json({
        success: true,
        data: {
          content: {
            heroTitle: 'Empowering the Future of Bangladesh\'s Apparel Industry',
            heroSubtitle: 'Professional training, job opportunities, and essential resources - all in one place!',
            heroButtons: [
              { text: 'Explore Courses', link: '/courses', variant: 'primary' },
              { text: 'Find Jobs', link: '/jobs', variant: 'secondary' }
            ],
            impactTitle: 'Our Impact in Numbers',
            impactSubtitle: 'Join a thriving community of learners and professionals transforming their careers',
            impactStats: [
              { icon: 'GraduationCap', label: 'Active Students', value: 2500, color: 'blue', bgColor: 'bg-blue-50' },
              { icon: 'BookOpen', label: 'Professional Courses', value: 120, color: 'green', bgColor: 'bg-green-50' },
              { icon: 'Calendar', label: 'Training Batches', value: 80, color: 'purple', bgColor: 'bg-purple-50' },
              { icon: 'Building', label: 'Expert Instructors', value: 40, color: 'orange', bgColor: 'bg-orange-50' }
            ],
            featureCards: [
              { icon: '📝', title: 'Write Blog', description: 'Share your knowledge', link: '/blog', buttonText: 'Find Blog', color: 'blue' },
              { icon: '🎓', title: 'Courses', description: 'Professional training', link: '/courses', buttonText: 'Start Learning', color: 'green' },
              { icon: '💼', title: 'Job Circular', description: 'Find opportunities', link: '/jobs', buttonText: 'Apply Now', color: 'yellow' },
              { icon: '📄', title: 'Documents', description: 'Essential resources', link: '/library', buttonText: 'Check Now', color: 'brown' },
              { icon: '📚', title: 'Library', description: 'Resource collection', link: '/library', buttonText: 'Read Now', color: 'indigo' }
            ]
          }
        }
      });
    }

    // Try to fetch from database, but don't fail if model doesn't exist
    try {
      const HomepageContent = require('../models/HomepageContent');
      let content = await HomepageContent.findOne();
      
      if (!content) {
        // Create default content
        content = await HomepageContent.create({});
      }

      console.log('🏠 Homepage content fetched from database');

      return res.json({
        success: true,
        data: { content }
      });
    } catch (dbError) {
      console.log('⚠️  Database model error, returning default content:', dbError.message);
      // Return default content if model doesn't exist or query fails
      return res.json({
        success: true,
        data: {
          content: {
            heroTitle: 'Empowering the Future of Bangladesh\'s Apparel Industry',
            heroSubtitle: 'Professional training, job opportunities, and essential resources - all in one place!',
            heroButtons: [
              { text: 'Explore Courses', link: '/courses', variant: 'primary' },
              { text: 'Find Jobs', link: '/jobs', variant: 'secondary' }
            ],
            impactTitle: 'Our Impact in Numbers',
            impactSubtitle: 'Join a thriving community of learners and professionals transforming their careers',
            impactStats: [
              { icon: 'GraduationCap', label: 'Active Students', value: 2500, color: 'blue', bgColor: 'bg-blue-50' },
              { icon: 'BookOpen', label: 'Professional Courses', value: 120, color: 'green', bgColor: 'bg-green-50' },
              { icon: 'Calendar', label: 'Training Batches', value: 80, color: 'purple', bgColor: 'bg-purple-50' },
              { icon: 'Building', label: 'Expert Instructors', value: 40, color: 'orange', bgColor: 'bg-orange-50' }
            ],
            featureCards: [
              { icon: '📝', title: 'Write Blog', description: 'Share your knowledge', link: '/blog', buttonText: 'Find Blog', color: 'blue' },
              { icon: '🎓', title: 'Courses', description: 'Professional training', link: '/courses', buttonText: 'Start Learning', color: 'green' },
              { icon: '💼', title: 'Job Circular', description: 'Find opportunities', link: '/jobs', buttonText: 'Apply Now', color: 'yellow' },
              { icon: '📄', title: 'Documents', description: 'Essential resources', link: '/library', buttonText: 'Check Now', color: 'brown' },
              { icon: '📚', title: 'Library', description: 'Resource collection', link: '/library', buttonText: 'Read Now', color: 'indigo' }
            ]
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ Error fetching homepage content:', error);
    console.error('Error stack:', error.stack);
    // Always return success with default content instead of 500 error
    res.json({
      success: true,
      data: {
        content: {
          heroTitle: 'Empowering the Future of Bangladesh\'s Apparel Industry',
          heroSubtitle: 'Professional training, job opportunities, and essential resources - all in one place!',
          heroButtons: [
            { text: 'Explore Courses', link: '/courses', variant: 'primary' },
            { text: 'Find Jobs', link: '/jobs', variant: 'secondary' }
          ],
          impactTitle: 'Our Impact in Numbers',
          impactSubtitle: 'Join a thriving community of learners and professionals transforming their careers',
          impactStats: [
            { icon: 'GraduationCap', label: 'Active Students', value: 2500, color: 'blue', bgColor: 'bg-blue-50' },
            { icon: 'BookOpen', label: 'Professional Courses', value: 120, color: 'green', bgColor: 'bg-green-50' },
            { icon: 'Calendar', label: 'Training Batches', value: 80, color: 'purple', bgColor: 'bg-purple-50' },
            { icon: 'Building', label: 'Expert Instructors', value: 40, color: 'orange', bgColor: 'bg-orange-50' }
          ],
          featureCards: [
            { icon: '📝', title: 'Write Blog', description: 'Share your knowledge', link: '/blog', buttonText: 'Find Blog', color: 'blue' },
            { icon: '🎓', title: 'Courses', description: 'Professional training', link: '/courses', buttonText: 'Start Learning', color: 'green' },
            { icon: '💼', title: 'Job Circular', description: 'Find opportunities', link: '/jobs', buttonText: 'Apply Now', color: 'yellow' },
            { icon: '📄', title: 'Documents', description: 'Essential resources', link: '/library', buttonText: 'Check Now', color: 'brown' },
            { icon: '📚', title: 'Library', description: 'Resource collection', link: '/library', buttonText: 'Read Now', color: 'indigo' }
          ]
        }
      }
    });
  }
});

module.exports = router;

