const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

const app = express();

// Running behind nginx/reverse proxy in production.
// Needed so req.ip uses X-Forwarded-For (otherwise many users share one IP and hit rate limits fast).
app.set('trust proxy', 1);

// CORS first
// - In production: allow multiple origins via CORS_ORIGINS (comma-separated)
// - In development: allow all origins
const corsOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Always allow these origins in production
const allowedOrigins = [
  'https://rmgstar.com',
  'https://www.rmgstar.com',
  'https://admin.rmgstar.com',
  'http://localhost:3000',
  'http://localhost:3001',
  ...corsOrigins
];

const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    
    // Always allow our production domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // If allowlist is not configured, fail open (prevents production breakage due to missing env)
    if (corsOrigins.length === 0) {
      console.warn('⚠️  CORS_ORIGINS not set, allowing all origins');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject unknown origins
    console.warn('❌ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests globally (critical when Authorization header is present)
// Must be before routes
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  res.status(200).end();
});

// Security middleware - configure helmet to allow static files and images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "http://localhost:5000",
            "http://localhost:3000",
            "https://api.rmgstar.com",
            "https://rmgstar.com",
            "https://admin.rmgstar.com"
          ],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          frameSrc: ["'self'", "https://api.rmgstar.com", "https://rmgstar.com"],
          frameAncestors: ["'self'", "https://rmgstar.com", "https://admin.rmgstar.com"],
        },
      },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Production sites can easily exceed 100 requests/15min (assets, prefetch, admin, etc.)
  max: process.env.NODE_ENV === 'production' ? 1000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsPath);
}
// Log static file requests
app.use('/uploads', (req, res, next) => {
  console.log('📁 Static file request:', req.path);
  const filePath = path.join(uploadsPath, req.path.replace('/uploads/', ''));
  if (fs.existsSync(filePath)) {
    console.log('✅ File exists:', filePath);
  } else {
    console.log('❌ File not found:', filePath);
  }
  next();
});

// Serve static files with proper headers
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // For uploads, reflect allowed Origin (so images load from both frontend/admin)
    const origin = res.req.headers.origin;
    if (process.env.NODE_ENV !== 'production') {
      res.set('Access-Control-Allow-Origin', origin || '*');
    } else if (origin && corsOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));
console.log('✅ Serving static files from:', uploadsPath);

// Test route to verify static file serving
app.get('/test-upload', (req, res) => {
  const testFile = path.join(uploadsPath, 'test.txt');
  fs.writeFileSync(testFile, 'test');
  res.json({ 
    message: 'Test file created',
    uploadsPath: uploadsPath,
    files: fs.readdirSync(uploadsPath).slice(0, 5)
  });
});

// Database connection with automatic retry and MongoDB auto-start
const connectDB = async (retries = 5, delay = 2000) => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmg-platform';
  
  console.log(`🔌 Attempting to connect to MongoDB at: ${mongoURI.replace(/\/\/.*@/, '//***@')}`);
  
  // Try to start MongoDB if not running (only in development)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { startMongoDB } = require('./scripts/start-mongodb');
      const started = await startMongoDB();
      if (started) {
        // Wait a bit more for MongoDB to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.log('⚠️  MongoDB auto-start skipped:', err.message);
    }
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB already connected');
        return true;
      }
      
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      
      // Setup connection event handlers for auto-reconnect
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 20;
      let reconnectInterval = null;
      
      mongoose.connection.on('disconnected', async () => {
        console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        reconnectAttempts = 0;
        
        // Clear any existing reconnect interval
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
        }
        
        // Try to start MongoDB if not running (only in development)
        if (process.env.NODE_ENV !== 'production') {
          try {
            const { startMongoDB } = require('./scripts/start-mongodb');
            console.log('🔄 Attempting to start MongoDB...');
            await startMongoDB();
            // Wait a bit for MongoDB to start
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (err) {
            console.error('❌ Failed to start MongoDB:', err.message);
          }
        }
        
        // Retry connection with exponential backoff
        reconnectInterval = setInterval(async () => {
          reconnectAttempts++;
          
          if (reconnectAttempts > maxReconnectAttempts) {
            if (reconnectInterval) {
              clearInterval(reconnectInterval);
              reconnectInterval = null;
            }
            console.error('❌ Max reconnection attempts reached. Please check MongoDB manually.');
            console.log('💡 To fix this:');
            console.log('   Windows: Open Services (services.msc) and start MongoDB service');
            console.log('   Or run: net start MongoDB');
            console.log('   Or start mongod.exe manually');
            return;
          }
          
          try {
            if (mongoose.connection.readyState === 0) {
              await mongoose.connect(mongoURI, { 
                maxPoolSize: 10, 
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000
              });
              console.log(`✅ Reconnected to MongoDB after ${reconnectAttempts} attempt(s)`);
              if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
              }
              reconnectAttempts = 0;
            } else if (mongoose.connection.readyState === 1) {
              // Already connected
              if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
              }
              reconnectAttempts = 0;
            }
          } catch (err) {
            console.log(`⏳ Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} failed:`, err.message);
          }
        }, 3000); // Retry every 3 seconds
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        // Don't attempt reconnect here, let 'disconnected' event handle it
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully');
        reconnectAttempts = 0;
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      });
      
      // Handle connection close
      mongoose.connection.on('close', () => {
        console.warn('⚠️  MongoDB connection closed');
      });
      
      return true;
    } catch (err) {
      if (i < retries - 1) {
        console.log(`⏳ Attempt ${i + 1}/${retries} - Retrying MongoDB connection in ${delay/1000}s...`);
        console.log(`   Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.warn('\n⚠️  MongoDB connection failed after', retries, 'attempts');
        console.warn('   Error:', err.message);
        console.log('\n📝 Server will continue running without database connection');
        console.log('💡 To fix this, please start MongoDB:');
        console.log('   Windows:');
        console.log('     1. Open Services (Win+R → services.msc)');
        console.log('     2. Find "MongoDB" service and start it');
        console.log('     3. Or run: net start MongoDB');
        console.log('   macOS:');
        console.log('     brew services start mongodb-community');
        console.log('   Linux:');
        console.log('     sudo systemctl start mongod');
        console.log('\n💡 Or install MongoDB if not installed:');
        console.log('   https://www.mongodb.com/try/download/community\n');
        return false;
      }
    }
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/library', require('./routes/library'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/document-categories', require('./routes/document-categories'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/header', require('./routes/header'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/trainers', require('./routes/trainers'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/admin', require('./routes/admin'));

// Root route - API info
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    message: 'RMG Platform API Server',
    status: 'running',
    database: dbStatus,
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses',
      jobs: '/api/jobs',
      blog: '/api/blog',
      library: '/api/library',
      stats: '/api/stats',
      homepage: '/api/homepage',
      admin: '/api/admin'
    },
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    database: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

// Test route for API connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    server: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware - ensure CORS headers are set even on errors
app.use((err, req, res, next) => {
  // Set CORS headers before sending error response
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  console.error('❌ Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Check if port is available and kill process if needed (development only)
const checkAndFreePort = async (port) => {
  return new Promise((resolve) => {
    if (process.env.NODE_ENV === 'production') {
      resolve(false);
      return;
    }

    // Check if port is in use
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        // Port is free
        resolve(false);
        return;
      }

      // Extract PID from output
      const lines = stdout.trim().split('\n');
      const pidLine = lines.find(line => line.includes('LISTENING'));
      
      if (!pidLine) {
        resolve(false);
        return;
      }

      const pid = pidLine.trim().split(/\s+/).pop();
      
      if (!pid || pid === '0') {
        resolve(false);
        return;
      }

      console.log(`⚠️  Port ${port} is in use by process ${pid}`);
      console.log(`🔄 Attempting to free port ${port}...`);

      // Kill the process
      exec(`taskkill /PID ${pid} /F`, (killError) => {
        if (killError) {
          console.log(`⚠️  Could not automatically free port ${port}`);
          console.log(`💡 Please manually kill process ${pid} or use a different port`);
          resolve(false);
        } else {
          console.log(`✅ Freed port ${port} by killing process ${pid}`);
          // Wait a bit for port to be released
          setTimeout(() => resolve(true), 1000);
        }
      });
    });
  });
};

// Start server after database connection attempt
const startServer = async () => {
  console.log('🔄 Initializing server...');
  
  // Try to connect to database first
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  
  // Check and free port if needed (development only)
  await checkAndFreePort(PORT);
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`💡 Frontend should connect to: http://localhost:${PORT}/api`);
    
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database is connected and ready');
    } else {
      console.log('⚠️  Database is not connected - some features may not work');
    }
  });
  
  // Handle port already in use error (fallback)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is still in use after cleanup attempt!`);
      console.log(`\n💡 Solutions:`);
      console.log(`   1. Kill the process manually:`);
      console.log(`      Windows: netstat -ano | findstr :${PORT}`);
      console.log(`      Then: taskkill /PID <PID> /F`);
      console.log(`   2. Or use a different port by setting PORT environment variable:`);
      console.log(`      PORT=5001 npm run dev`);
      console.log(`\n⏳ Server will retry on next file change...\n`);
      // Don't exit, let nodemon restart when file changes
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
};

// Start the server
startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
