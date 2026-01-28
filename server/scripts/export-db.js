const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const JobPost = require('../models/JobPost');
const JobApplication = require('../models/JobApplication');
const LibraryItem = require('../models/LibraryItem');
const Post = require('../models/Post');
const HomepageContent = require('../models/HomepageContent');
const Stats = require('../models/Stats');
const TrainerProfile = require('../models/TrainerProfile');
const Employer = require('../models/Employer');

const models = {
  users: User,
  courses: Course,
  batches: Batch,
  enrollments: Enrollment,
  jobposts: JobPost,
  jobapplications: JobApplication,
  libraryitems: LibraryItem,
  posts: Post,
  homepagecontent: HomepageContent,
  stats: Stats,
  trainerprofiles: TrainerProfile,
  employers: Employer
};

async function exportDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const exportData = {};
    const exportDir = path.join(__dirname, '../../database-export');

    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Export each collection
    for (const [collectionName, Model] of Object.entries(models)) {
      try {
        const data = await Model.find({}).lean();
        exportData[collectionName] = data;
        console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
      } catch (error) {
        console.error(`❌ Error exporting ${collectionName}:`, error.message);
      }
    }

    // Save to JSON file
    const exportFile = path.join(exportDir, `export-${Date.now()}.json`);
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Database exported to: ${exportFile}`);

    // Also save as latest
    const latestFile = path.join(exportDir, 'latest-export.json');
    fs.writeFileSync(latestFile, JSON.stringify(exportData, null, 2));
    console.log(`✅ Latest export saved to: ${latestFile}`);

    await mongoose.connection.close();
    console.log('\n✅ Export completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Export error:', error);
    process.exit(1);
  }
}

exportDatabase();

