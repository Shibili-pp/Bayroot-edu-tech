const express = require('express');
const router = express.Router();
const universityController = require('../controllers/university.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All university routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all universities
router.get('/', universityController.getAllUniversities);

// Create university (Admin only)
router.post('/', checkAdmin, universityController.createUniversity);

// Get single university
router.get('/:id', universityController.getUniversity);

// Update university (Admin only)
router.put('/:id', checkAdmin, universityController.updateUniversity);

// Delete university (Admin only)
router.delete('/:id', checkAdmin, universityController.deleteUniversity);

module.exports = router;

