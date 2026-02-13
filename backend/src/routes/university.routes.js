const express = require('express');
const router = express.Router();
const universityController = require('../controllers/university.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All university routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all universities
router.get('/', universityController.getAllUniversities);

// Get single university
router.get('/:id', universityController.getUniversity);

module.exports = router;

