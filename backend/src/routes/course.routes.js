const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All course routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all courses
router.get('/', courseController.getAllCourses);

// Create course (Admin only)
router.post('/', checkAdmin, courseController.createCourse);

// Get single course
router.get('/:id', courseController.getCourse);

// Update course (Admin only)
router.put('/:id', checkAdmin, courseController.updateCourse);

// Delete course (Admin only)
router.delete('/:id', checkAdmin, courseController.deleteCourse);

module.exports = router;

