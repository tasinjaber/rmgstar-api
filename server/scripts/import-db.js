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

async function importDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find import file
    const exportDir = path.join(__dirname, '../../database-export');
    let importFile = process.argv[2]; // Allow custom file path

    if (!importFile) {
      // Try to find latest export
      const latestFile = path.join(exportDir, 'latest-export.json');
      if (fs.existsSync(latestFile)) {
        importFile = latestFile;
        console.log(`📁 Using latest export: ${importFile}`);
      } else {
        // Find most recent export
        const files = fs.readdirSync(exportDir)
          .filter(f => f.startsWith('export-') && f.endsWith('.json'))
          .map(f => ({
            name: f,
            path: path.join(exportDir, f),
            time: fs.statSync(path.join(exportDir, f)).mtime
          }))
          .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
          console.error('❌ No export file found. Please export database first or provide file path.');
          console.log('💡 Usage: node server/scripts/import-db.js [path-to-export-file.json]');
          process.exit(1);
        }

        importFile = files[0].path;
        console.log(`📁 Using most recent export: ${importFile}`);
      }
    }

    if (!fs.existsSync(importFile)) {
      console.error(`❌ Import file not found: ${importFile}`);
      process.exit(1);
    }

    // Read import data
    const importData = JSON.parse(fs.readFileSync(importFile, 'utf8'));
    console.log(`📦 Importing data from: ${importFile}\n`);

    // Clear existing data (optional - comment out if you want to merge)
    console.log('🗑️  Clearing existing data...');
    for (const Model of Object.values(models)) {
      await Model.deleteMany({});
    }
    console.log('✅ Existing data cleared\n');

    // Import each collection
    let totalImported = 0;
    for (const [collectionName, Model] of Object.entries(models)) {
      if (importData[collectionName] && importData[collectionName].length > 0) {
        try {
          // Remove _id to let MongoDB generate new ones (or keep existing)
          const data = importData[collectionName].map(item => {
            const { _id, __v, ...rest } = item;
            return rest;
          });

          const result = await Model.insertMany(data, { ordered: false });
          console.log(`✅ Imported ${result.length} documents to ${collectionName}`);
          totalImported += result.length;
        } catch (error) {
          console.error(`❌ Error importing ${collectionName}:`, error.message);
          // Continue with other collections
        }
      } else {
        console.log(`⚠️  No data found for ${collectionName}`);
      }
    }

    await mongoose.connection.close();
    console.log(`\n✅ Import completed successfully!`);
    console.log(`📊 Total documents imported: ${totalImported}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  }
}

importDatabase();

