const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

const platform = os.platform();

async function checkMongoRunning() {
  try {
    // Try to connect to MongoDB to check if it's running
    const mongoose = require('mongoose');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform';
    
    // If already connected, return true
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000,
    });
    await mongoose.disconnect();
    return true;
  } catch (err) {
    // If connection was attempted, try to close it
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (closeErr) {
      // Ignore close errors
    }
    return false;
  }
}

async function startMongoDB() {
  console.log('🔄 Checking MongoDB status...');
  
  const isRunning = await checkMongoRunning();
  if (isRunning) {
    console.log('✅ MongoDB is already running');
    return true;
  }

  console.log('⚠️  MongoDB is not running. Attempting to start...\n');

  try {
    if (platform === 'win32') {
      // Windows: Try to start MongoDB service
      try {
        await execAsync('net start MongoDB');
        console.log('✅ MongoDB service started successfully');
        // Wait a bit for MongoDB to fully start
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } catch (err) {
        // Try alternative: mongod command
        try {
          const mongodPath = process.env.MONGODB_PATH || 'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe';
          console.log(`📝 Trying to start MongoDB from: ${mongodPath}`);
          exec(`"${mongodPath}" --dbpath "${process.env.MONGODB_DATA_PATH || 'C:\\data\\db'}"`, (error) => {
            if (error) {
              console.log('⚠️  Could not start MongoDB automatically');
              console.log('💡 Please start MongoDB manually:');
              console.log('   1. Open Services (services.msc) and start MongoDB service');
              console.log('   2. Or run: net start MongoDB');
              console.log('   3. Or start mongod.exe manually');
            }
          });
          // Wait for MongoDB to start
          await new Promise(resolve => setTimeout(resolve, 5000));
          return await checkMongoRunning();
        } catch (err2) {
          console.log('⚠️  Could not start MongoDB automatically');
          console.log('💡 Please start MongoDB manually:');
          console.log('   1. Open Services (services.msc) and start MongoDB service');
          console.log('   2. Or run: net start MongoDB');
          console.log('   3. Or start mongod.exe manually');
          return false;
        }
      }
    } else if (platform === 'darwin') {
      // macOS: Try brew services
      try {
        await execAsync('brew services start mongodb-community');
        console.log('✅ MongoDB started via Homebrew');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } catch (err) {
        try {
          await execAsync('mongod --fork --logpath /tmp/mongodb.log');
          console.log('✅ MongoDB started');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        } catch (err2) {
          console.log('⚠️  Could not start MongoDB automatically');
          console.log('💡 Please start MongoDB manually:');
          console.log('   brew services start mongodb-community');
          return false;
        }
      }
    } else {
      // Linux: Try systemctl
      try {
        await execAsync('sudo systemctl start mongod');
        console.log('✅ MongoDB service started');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } catch (err) {
        try {
          await execAsync('mongod --fork --logpath /var/log/mongodb/mongod.log');
          console.log('✅ MongoDB started');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        } catch (err2) {
          console.log('⚠️  Could not start MongoDB automatically');
          console.log('💡 Please start MongoDB manually:');
          console.log('   sudo systemctl start mongod');
          return false;
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Could not start MongoDB automatically');
    console.log('💡 Please start MongoDB manually');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  startMongoDB()
    .then(success => {
      if (success) {
        console.log('\n✅ MongoDB is ready');
        process.exit(0);
      } else {
        console.log('\n⚠️  MongoDB could not be started automatically');
        console.log('📝 Server will continue, but database features may not work');
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { startMongoDB, checkMongoRunning };

