const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { downloadRateLimiter, generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { checkDownloadLimit } = require('../middlewares/downloadLimit.middleware');
const upload = require('../middlewares/upload.middleware');

// All file routes require authentication
router.use(verifyToken);

// Upload file endpoint (before student creation)
router.post('/upload', generalRateLimiter, authorize('PARTNER', 'ADMIN'), upload.single('file'), fileController.uploadFile);

// Download file endpoint (with download limit for Partners)
router.get('/:fileId', downloadRateLimiter, authorize('PARTNER', 'ADMIN'), checkDownloadLimit, fileController.downloadFile);

module.exports = router;

