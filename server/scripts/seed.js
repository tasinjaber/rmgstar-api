const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const JobPost = require('../models/JobPost');
const LibraryItem = require('../models/LibraryItem');
const Post = require('../models/Post');
const HomepageContent = require('../models/HomepageContent');
const Stats = require('../models/Stats');
const TrainerProfile = require('../models/TrainerProfile');
const Employer = require('../models/Employer');
const Enrollment = require('../models/Enrollment');
const JobApplication = require('../models/JobApplication');
const { slugify } = require('../utils/slugify');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Function to create backup before seeding
async function createBackup() {
  try {
    const models = {
      users: User,
      courses: Course,
      batches: Batch,
      jobposts: JobPost,
      libraryitems: LibraryItem,
      posts: Post,
      homepagecontent: HomepageContent,
      stats: Stats,
      trainerprofiles: TrainerProfile,
      employers: Employer,
      enrollments: Enrollment,
      jobapplications: JobApplication
    };

    const exportData = {};
    let hasData = false;

    // Check if there's any existing data
    for (const [collectionName, Model] of Object.entries(models)) {
      const count = await Model.countDocuments();
      if (count > 0) {
        hasData = true;
        const data = await Model.find({}).lean();
        exportData[collectionName] = data;
      }
    }

    if (!hasData) {
      console.log('ℹ️  No existing data to backup');
      return null;
    }

    // Create export directory
    const exportDir = path.join(__dirname, '../../database-export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Save backup
    const backupFile = path.join(exportDir, `backup-before-seed-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(exportData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('⚠️  Backup creation failed:', error.message);
    return null;
  }
}

// Function to ask for confirmation
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function seed() {
  try {
    // Check if there's existing data
    const userCount = await User.countDocuments();
    const courseCount = await Course.countDocuments();
    
    if (userCount > 0 || courseCount > 0) {
      console.log('\n⚠️  WARNING: Existing data found in database!');
      console.log(`   Users: ${userCount}, Courses: ${courseCount}`);
      console.log('\n⚠️  This will DELETE ALL existing data and replace it with default seed data!');
      
      const confirmed = await askConfirmation('\n❓ Are you sure you want to continue? (yes/no): ');
      
      if (!confirmed) {
        console.log('\n❌ Seeding cancelled. No data was modified.');
        process.exit(0);
      }

      // Create backup before clearing
      console.log('\n📦 Creating backup before clearing data...');
      await createBackup();
    }

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Batch.deleteMany({});
    await JobPost.deleteMany({});
    await LibraryItem.deleteMany({});
    await Post.deleteMany({});
    await HomepageContent.deleteMany({});
    await Stats.deleteMany({});
    await TrainerProfile.deleteMany({});
    await Employer.deleteMany({});
    await Enrollment.deleteMany({});
    await JobApplication.deleteMany({});

    console.log('✅ Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@platform.com',
      passwordHash: adminPassword,
      role: 'admin',
      phone: '+880-1234567890'
    });
    console.log('Created admin user');

    // Create trainer users
    const trainerPassword = await bcrypt.hash('Trainer123!', 10);
    const trainer1 = await User.create({
      name: 'Md. Rakibul Ahsan',
      email: 'trainer1@platform.com',
      passwordHash: trainerPassword,
      role: 'trainer',
      phone: '+880-1234567891'
    });

    const trainer2 = await User.create({
      name: 'Fatima Rahman',
      email: 'trainer2@platform.com',
      passwordHash: trainerPassword,
      role: 'trainer',
      phone: '+880-1234567892'
    });

    // Create trainer profiles
    await TrainerProfile.create({
      userId: trainer1._id,
      bio: 'Expert in Merchandising and Quality Control with 15+ years of experience',
      expertiseAreas: ['Merchandising', 'Quality Control', 'Production'],
      photo: '',
      socialLinks: {
        linkedin: 'https://linkedin.com/in/trainer1',
        website: 'https://trainer1.com'
      }
    });

    await TrainerProfile.create({
      userId: trainer2._id,
      bio: 'Specialized in Garment Costing and Production Management',
      expertiseAreas: ['Costing', 'Production', 'Management'],
      photo: '',
    });

    // Create student users
    const studentPassword = await bcrypt.hash('Student123!', 10);
    for (let i = 1; i <= 5; i++) {
      await User.create({
        name: `Student ${i}`,
        email: `student${i}@platform.com`,
        passwordHash: studentPassword,
        role: 'student',
        phone: `+880-1234567${900 + i}`
      });
    }

    // Create employer
    const employerPassword = await bcrypt.hash('Employer123!', 10);
    const employer = await User.create({
      name: 'John Doe',
      email: 'employer@platform.com',
      passwordHash: employerPassword,
      role: 'employer',
      phone: '+880-1234567899'
    });

    await Employer.create({
      userId: employer._id,
      companyName: 'ABC Garments Ltd.',
      website: 'https://abcgarments.com',
      address: 'Dhaka, Bangladesh',
      description: 'Leading garment manufacturer'
    });

    console.log('Created users');

    // Create courses
    const courses = [
      {
        title: 'Sales & Buyer Onboarding',
        shortDescription: 'From Pitch to PO',
        description: 'Comprehensive course on sales techniques and buyer onboarding processes in the RMG industry.',
        category: 'Marketing',
        level: 'Intermediate',
        language: 'English',
        mode: 'online',
        durationText: '2 Months',
        price: 2400,
        discountPrice: 2000,
        isFeatured: true,
        trainerId: trainer1._id
      },
      {
        title: 'Next-Level Merchandising',
        shortDescription: 'Two Months Intensive Program',
        description: 'Advanced merchandising techniques and best practices for RMG professionals.',
        category: 'Merchandising',
        level: 'Advanced',
        language: 'Both',
        mode: 'hybrid',
        durationText: '2 Months',
        price: 2900,
        isFeatured: true,
        trainerId: trainer1._id
      },
      {
        title: 'Garment Costing Masterclass',
        shortDescription: 'From Basic to Advance',
        description: 'Master the art of garment costing from basic calculations to advanced pricing strategies.',
        category: 'Merchandising',
        level: 'Advanced',
        language: 'English',
        mode: 'online',
        durationText: '6 Weeks',
        price: 2400,
        isFeatured: true,
        trainerId: trainer2._id
      }
    ];

    const createdCourses = [];
    for (const courseData of courses) {
      const slug = slugify(courseData.title);
      const course = await Course.create({
        ...courseData,
        slug
      });
      createdCourses.push(course);
    }

    console.log('Created courses');

    // Create batches
    const now = new Date();
    for (const course of createdCourses) {
      await Batch.create({
        courseId: course._id,
        trainerId: course.trainerId,
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        mode: course.mode,
        seatLimit: 30,
        enrolledCount: Math.floor(Math.random() * 10),
        status: 'upcoming'
      });
    }

    console.log('Created batches');

    // Create job posts
    const jobs = [
      {
        employerId: employer._id,
        title: 'Senior Merchandiser',
        companyName: 'ABC Garments Ltd.',
        location: 'Dhaka',
        category: 'Merchandising',
        type: 'Full-time',
        description: 'We are looking for an experienced Senior Merchandiser to join our team.',
        requirements: '5+ years of experience in RMG merchandising, excellent communication skills',
        salaryRange: {
          min: 50000,
          max: 80000,
          currency: 'BDT'
        },
        experience: {
          min: 5,
          max: 10
        },
        deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        applyType: 'internal',
        isActive: true
      },
      {
        employerId: employer._id,
        title: 'Quality Control Manager',
        companyName: 'XYZ Textiles',
        location: 'Chittagong',
        category: 'Quality Control',
        type: 'Full-time',
        description: 'Seeking a Quality Control Manager with extensive experience in textile quality assurance.',
        requirements: '7+ years in QC, knowledge of international standards',
        salaryRange: {
          min: 60000,
          max: 90000,
          currency: 'BDT'
        },
        experience: {
          min: 7,
          max: 15
        },
        deadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        applyType: 'internal',
        isActive: true
      }
    ];

    for (const jobData of jobs) {
      await JobPost.create(jobData);
    }

    console.log('Created job posts');

    // Create library items
    const libraryItems = [
      {
        title: 'Bangladesh Apparel Industry Guide',
        category: 'Guide',
        description: 'Comprehensive guide to the Bangladesh apparel industry',
        format: 'pdf',
        isMembersOnly: false,
        author: 'RMG Platform',
        publishDate: new Date()
      },
      {
        title: 'Quality Control Standards',
        category: 'Standard',
        description: 'International quality control standards for garments',
        format: 'pdf',
        isMembersOnly: true,
        author: 'RMG Platform',
        publishDate: new Date()
      }
    ];

    for (const itemData of libraryItems) {
      const slug = slugify(itemData.title);
      await LibraryItem.create({
        ...itemData,
        slug
      });
    }

    console.log('Created library items');

    // Create blog posts
    const posts = [
      {
        title: 'Garment Quality Types: Why and How',
        category: 'Training Tips',
        tags: ['Quality', 'Training'],
        content: 'This article explains the different types of garment quality, why quality control is important, and how to implement effective quality control measures.',
        excerpt: 'Learn about garment quality types and best practices',
        authorId: trainer1._id,
        publishedAt: new Date(),
        status: 'published'
      },
      {
        title: 'RMG & Textile Sector News Summary',
        category: 'Industry News',
        tags: ['News', 'Industry'],
        content: 'Latest news and trends in the RMG and textile sector, including market updates and industry developments.',
        excerpt: 'Stay updated with the latest RMG industry news',
        authorId: admin._id,
        publishedAt: new Date(),
        status: 'published'
      }
    ];

    for (const postData of posts) {
      const slug = slugify(postData.title);
      await Post.create({
        ...postData,
        slug
      });
    }

    console.log('Created blog posts');

    // Create homepage content
    await HomepageContent.create({
      heroTitle: 'Empowering the Future of Bangladesh\'s Apparel Industry',
      heroSubtitle: 'Professional training, job opportunities, and essential resources - all in one place!',
      heroButtons: [
        { text: 'Explore Courses', link: '/courses', variant: 'primary' },
        { text: 'Find Jobs', link: '/jobs', variant: 'secondary' }
      ],
      founderName: 'Md. Rakibul Ahsan',
      founderTitle: 'Lead Instructor & Expert',
      founderBio: '15+ years of experience in the RMG industry, specializing in Merchandising and Quality Control',
      founderPhoto: '',
      featureCards: [
        {
          icon: '📝',
          title: 'Write Blog',
          description: 'Share your knowledge and insights',
          link: '/blog',
          buttonText: 'Find Blog',
          color: 'blue'
        },
        {
          icon: '🎓',
          title: 'Courses',
          description: 'Professional training programs',
          link: '/courses',
          buttonText: 'Start Learning',
          color: 'green'
        },
        {
          icon: '💼',
          title: 'Job Circular',
          description: 'Find your next opportunity',
          link: '/jobs',
          buttonText: 'Apply Now',
          color: 'yellow'
        },
        {
          icon: '📄',
          title: 'Documents',
          description: 'Essential resources and guides',
          link: '/library',
          buttonText: 'Check Now',
          color: 'brown'
        },
        {
          icon: '📚',
          title: 'Library',
          description: 'Comprehensive resource collection',
          link: '/library',
          buttonText: 'Read Now',
          color: 'indigo'
        }
      ],
      communityTitle: 'RMG Platform Community',
      communityText: 'Join our vibrant community of RMG professionals. Share knowledge, network, and grow together.',
      communityVideoUrl: '',
      communityJoinLink: '',
      communityWatchLink: '',
      footerLogo: '',
      footerSiteName: 'RMG Platform',
      footerDescription: "Empowering the future of Bangladesh's apparel industry through professional training, job opportunities, and essential resources.",
      footerContactInfo: {
        email: 'info@rmgplatform.com',
        phone: '+880-1234567890',
        address: 'Dhaka, Bangladesh'
      },
      footerMenus: [
        {
          title: 'Quick Links',
          links: [
            { name: 'About Us', href: '/about' },
            { name: 'Courses', href: '/courses' },
            { name: 'Jobs', href: '/jobs' },
            { name: 'Blog', href: '/blog' },
            { name: 'Contact', href: '/contact' }
          ]
        },
        {
          title: 'Resources',
          links: [
            { name: 'Library', href: '/library' },
            { name: 'Training Calendar', href: '/training-calendar' },
            { name: 'Community', href: '/community' },
            { name: 'FAQ', href: '/faq' }
          ]
        },
        {
          title: 'Legal',
          links: [
            { name: 'Privacy Policy', href: '/privacy' },
            { name: 'Terms of Service', href: '/terms' },
            { name: 'Refund Policy', href: '/refund' }
          ]
        }
      ],
      footerSocialLinks: {
        facebook: 'https://facebook.com/rmgplatform',
        twitter: '',
        linkedin: 'https://linkedin.com/company/rmgplatform',
        youtube: 'https://youtube.com/rmgplatform',
        instagram: '',
        pinterest: ''
      },
      socialLinks: {
        facebook: 'https://facebook.com/rmgplatform',
        linkedin: 'https://linkedin.com/company/rmgplatform',
        youtube: 'https://youtube.com/rmgplatform',
        twitter: '',
        instagram: '',
        pinterest: ''
      },
      footerText: 'Empowering the future of Bangladesh\'s apparel industry',
      contactEmail: 'info@rmgplatform.com',
      contactPhone: '+880-1234567890'
    });

    console.log('Created homepage content');

    // Create stats
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalInstructors = await User.countDocuments({ role: 'trainer', isActive: true });
    const totalCourses = await Course.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const Enrollment = require('../models/Enrollment');
    const totalEnrollments = await Enrollment.countDocuments();
    const totalPartners = await Employer.countDocuments();

    await Stats.create({
      totalStudents,
      totalInstructors,
      totalCourses,
      totalBatches,
      totalEnrollments,
      totalPartners
    });

    console.log('Created stats');

    console.log('\n✅ Seeding completed successfully!');
    console.log('\nDefault credentials:');
    console.log('Admin: admin@platform.com / Admin123!');
    console.log('Trainer: trainer1@platform.com / Trainer123!');
    console.log('Student: student1@platform.com / Student123!');
    console.log('Employer: employer@platform.com / Employer123!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();

