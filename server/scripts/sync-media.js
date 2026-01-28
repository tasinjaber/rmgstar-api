const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Media = require('../models/Media');

async function syncMedia() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform');
    console.log('✅ Connected to MongoDB');

    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory does not exist');
      process.exit(1);
    }

    // Get all files from uploads directory recursively
    function getAllFiles(dir, baseDir, fileList = []) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              getAllFiles(filePath, baseDir, fileList);
            } else {
              let relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
              // Ensure path starts with 'uploads/'
              if (!relativePath.startsWith('uploads/')) {
                relativePath = 'uploads/' + relativePath;
              }
              fileList.push({
                name: file,
                path: filePath,
                relativePath: relativePath
              });
            }
          } catch (err) {
            console.error(`Error reading ${filePath}:`, err.message);
          }
        });
      } catch (err) {
        console.error(`Error reading directory ${dir}:`, err.message);
      }
      return fileList;
    }

    const allFiles = getAllFiles(uploadsDir, uploadsDir);
    console.log(`📁 Found ${allFiles.length} files in uploads directory (including subdirectories)`);
    console.log(`📂 Scanning directory: ${uploadsDir}`);

    let synced = 0;
    let skipped = 0;

    for (const fileInfo of allFiles) {
      const filePath = fileInfo.path;
      const stats = fs.statSync(filePath);
      const file = fileInfo.name;
      const relativePath = fileInfo.relativePath;

      // Check if already in database (by filename or url)
      const existing = await Media.findOne({ 
        $or: [
          { filename: file },
          { url: `/${relativePath}` }
        ]
      });
      if (existing) {
        skipped++;
        console.log(`⏭️  Skipped (already exists): ${relativePath}`);
        continue;
      }

      // Get file info
      const ext = path.extname(file).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      const type = ext.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 
                   ext.match(/\.(pdf|doc|docx)$/i) ? 'document' : 'other';

      // Ensure URL starts with /uploads/
      let mediaUrl = relativePath
      if (!mediaUrl.startsWith('/')) {
        mediaUrl = '/' + mediaUrl
      }
      if (!mediaUrl.startsWith('/uploads/')) {
        mediaUrl = '/uploads' + (mediaUrl.startsWith('/') ? '' : '/') + mediaUrl.replace(/^\/+/, '')
      }
      
      // Create media entry with relative path
      const media = new Media({
        filename: file,
        originalName: file,
        url: mediaUrl,
        path: mediaUrl,
        mimeType: mimeType,
        size: stats.size,
        type: type
      });

      await media.save();
      synced++;
      console.log(`✅ Synced: ${relativePath}`);
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Synced: ${synced} files`);
    console.log(`   Skipped: ${skipped} files (already in database)`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing media:', error);
    process.exit(1);
  }
}

syncMedia();

