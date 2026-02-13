const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All course routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all courses
router.get('/', courseController.getAllCourses);

// Get single course
router.get('/:id', courseController.getCourse);

module.exports = router;

