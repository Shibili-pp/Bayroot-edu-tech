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

// List files (with optional filtering) - must be before /:fileId route
router.get('/', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.listFiles);

// Download document (proxies from S3 to avoid CORS) - must be before /document route
router.get('/download', downloadRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.downloadDocument);

// Get presigned URL for document access (must be before /:fileId route)
// Use query parameter to handle s3Key with slashes
router.get('/document', downloadRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.getDocumentUrl);

// Get file metadata by fileId
router.get('/:fileId', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.getFileMetadata);

// Delete file from S3 and MongoDB
router.delete('/:fileId', generalRateLimiter, authorize('PARTNER', 'ADMIN'), fileController.deleteFile);

module.exports = router;

