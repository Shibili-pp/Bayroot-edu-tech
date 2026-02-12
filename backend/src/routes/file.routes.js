const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { downloadRateLimiter } = require('../middlewares/rateLimit.middleware');
const { checkDownloadLimit } = require('../middlewares/downloadLimit.middleware');

// All file routes require authentication and rate limiting
router.use(downloadRateLimiter);
router.use(verifyToken);

// Partner and Admin can download files (with download limit for Partners)
router.get('/:fileId', authorize('PARTNER', 'ADMIN'), checkDownloadLimit, fileController.downloadFile);

module.exports = router;

