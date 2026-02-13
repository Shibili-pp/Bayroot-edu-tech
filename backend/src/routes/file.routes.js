const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { downloadRateLimiter, generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { upload } = require('../middlewares/upload.middleware');

// All file routes require authentication
router.use(verifyToken);

// Upload file endpoint - uploads to S3 and saves metadata to MongoDB
router.post('/upload', generalRateLimiter, authorize('PARTNER', 'ADMIN'), upload.single('file'), fileController.uploadFile);

// Get file metadata by fileId
router.get('/:fileId', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.getFileMetadata);

// List files (with optional filtering)
router.get('/', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.listFiles);

// Delete file from S3 and MongoDB
router.delete('/:fileId', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.deleteFile);

module.exports = router;

