const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

// Import routes
const adminRoutes = require('./routes/admin.routes');
const partnerRoutes = require('./routes/partner.routes');
const studentRoutes = require('./routes/student.routes');
const fileRoutes = require('./routes/file.routes');
const courseRoutes = require('./routes/course.routes');
const universityRoutes = require('./routes/university.routes');
const countryRoutes = require('./routes/country.routes');
const announcementRoutes = require('./routes/announcement.routes');

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow file downloads
}));

// Disable x-powered-by header
app.disable('x-powered-by');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NOTE: Public static file serving removed for security
// Files are now accessed via secure endpoint: GET /api/files/:fileId

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bayroot Edu Tech API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      admin: {
        register: 'POST /api/admin/register',
        login: 'POST /api/admin/login',
        logout: 'POST /api/admin/logout (Protected)',
        profile: 'GET /api/admin/profile (Protected)'
      },
      partner: {
        register: 'POST /api/partner/register',
        login: 'POST /api/partner/login',
        logout: 'POST /api/partner/logout (Protected)',
        profile: 'GET /api/partner/profile (Protected)'
      },
      students: {
        create: 'POST /api/students (Protected - Partner only)',
        getAll: 'GET /api/students (Protected)',
        getOne: 'GET /api/students/:id (Protected)',
        update: 'PUT /api/students/:id (Protected)',
        uploadDocuments: 'POST /api/students/:id/documents (Protected)',
        delete: 'DELETE /api/students/:id (Protected - Admin only)'
      },
      files: {
        download: 'GET /api/files/:fileId (Protected)'
      }
    }
  });
});

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Health check route
app.get('/api/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  res.json({
    success: true,
    message: 'Bayroot Edu Tech API is running',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
    },
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/announcements', announcementRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    hint: 'Check available routes at GET /'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error without exposing sensitive information
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log full error details (but not sensitive env vars)
  const errorDetails = {
    message: err.message,
    name: err.name,
    stack: isProduction ? undefined : err.stack, // Hide stack trace in production
    path: req.path,
    method: req.method
  };
  
  // Never log sensitive environment variables
  if (errorDetails.message && typeof errorDetails.message === 'string') {
    // Remove any potential JWT secrets or encryption keys from error messages
    errorDetails.message = errorDetails.message.replace(/JWT_SECRET|ENCRYPTION_KEY|password|token/gi, '[REDACTED]');
  }
  
  console.error('Error:', errorDetails);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: isProduction ? 'Invalid input data' : err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }

  // Don't expose internal error details in production
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
  });
});

module.exports = app;

