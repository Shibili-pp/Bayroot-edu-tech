const express = require('express');
const router = express.Router();
const statusTimelineController = require('../controllers/statusTimeline.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All timeline routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get timeline rule for status transition (public endpoint for checking)
router.get('/check', statusTimelineController.getTimelineRuleForTransition);

// Get pending status updates (Admin only)
router.get('/pending-updates', checkAdmin, statusTimelineController.getPendingStatusUpdates);

// Get all timeline rules (Admin only)
router.get('/', checkAdmin, statusTimelineController.getAllTimelineRules);

// Create timeline rule (Admin only)
router.post('/', checkAdmin, statusTimelineController.createTimelineRule);

// Get single timeline rule (Admin only)
router.get('/:id', checkAdmin, statusTimelineController.getTimelineRule);

// Update timeline rule (Admin only)
router.put('/:id', checkAdmin, statusTimelineController.updateTimelineRule);

// Delete timeline rule (Admin only)
router.delete('/:id', checkAdmin, statusTimelineController.deleteTimelineRule);

module.exports = router;


