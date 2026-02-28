const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize, checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { upload } = require('../middlewares/upload.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(generalRateLimiter);

// Create announcement (Admin only) - with optional image
router.post('/', checkAdmin, upload.single('image'), announcementController.createAnnouncement);

// Get all announcements (Admin only)
router.get('/', checkAdmin, announcementController.getAllAnnouncements);

// Get visible announcements (Partner)
router.get('/visible', authorize('PARTNER'), announcementController.getVisibleAnnouncements);

// Get single announcement
router.get('/:id', authorize('ADMIN', 'PARTNER'), announcementController.getAnnouncement);

// Update announcement (Admin only)
router.put('/:id', checkAdmin, announcementController.updateAnnouncement);

// Delete announcement (Admin only)
router.delete('/:id', checkAdmin, announcementController.deleteAnnouncement);

module.exports = router;




