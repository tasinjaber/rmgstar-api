const mongoose = require('mongoose');
require('dotenv').config();

const CertificateTemplate = require('../models/CertificateTemplate');

async function seedDefaultTemplate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform');
    console.log('✅ Connected to MongoDB');

    // Check if default template exists
    const existing = await CertificateTemplate.findOne({ isDefault: true });
    if (existing) {
      console.log('✅ Default certificate template already exists');
      await mongoose.connection.close();
      return;
    }

    // Create default template
    const defaultTemplate = await CertificateTemplate.create({
      name: 'Default Course Certificate',
      description: 'Default template for course completion certificates',
      type: 'course',
      backgroundColor: '#ffffff',
      backgroundImage: '',
      logoUrl: '',
      isDefault: true,
      isActive: true
    });

    console.log('✅ Default certificate template created:', defaultTemplate._id);
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding certificate template:', error);
    process.exit(1);
  }
}

seedDefaultTemplate();

