const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All comment routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all comments for a student
router.get('/student/:studentId', authorize('PARTNER', 'ADMIN'), commentController.getComments);

// Create a new comment (with optional file uploads)
router.post('/student/:studentId', authorize('PARTNER', 'ADMIN'), upload.array('documents', 5), commentController.createComment);

// Update comment
router.put('/:commentId', authorize('PARTNER', 'ADMIN'), commentController.updateComment);

// Delete comment
router.delete('/:commentId', authorize('PARTNER', 'ADMIN'), commentController.deleteComment);

module.exports = router;



