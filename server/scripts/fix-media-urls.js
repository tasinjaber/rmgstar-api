const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Media = require('../models/Media');

async function fixMediaUrls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform');
    console.log('✅ Connected to MongoDB');

    // Find all media
    const allMedia = await Media.find({});
    console.log(`📁 Found ${allMedia.length} media items`);

    let updated = 0;
    let skipped = 0;

    for (const media of allMedia) {
      let newUrl = media.url;
      let updatedFlag = false;

      // Fix URL format
      if (!newUrl) {
        skipped++;
        continue;
      }

      // Remove leading slash if exists
      newUrl = newUrl.replace(/^\/+/, '');

      // If doesn't start with 'uploads/', add it
      if (!newUrl.startsWith('uploads/')) {
        newUrl = 'uploads/' + newUrl;
        updatedFlag = true;
      }

      // Add leading slash
      newUrl = '/' + newUrl;

      if (updatedFlag || media.url !== newUrl) {
        media.url = newUrl;
        media.path = newUrl;
        await media.save();
        updated++;
        console.log(`✅ Updated: ${media.filename} -> ${newUrl}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped (already correct): ${media.filename}`);
      }
    }

    console.log(`\n✅ Fix complete!`);
    console.log(`   Updated: ${updated} items`);
    console.log(`   Skipped: ${skipped} items (already correct)`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing media URLs:', error);
    process.exit(1);
  }
}

fixMediaUrls();

