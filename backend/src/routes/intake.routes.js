const express = require('express');
const router = express.Router();
const intakeController = require('../controllers/intake.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All intake routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all intakes
router.get('/', intakeController.getAllIntakes);

// Create intake (Admin only)
router.post('/', checkAdmin, intakeController.createIntake);

// Get single intake
router.get('/:id', intakeController.getIntake);

// Update intake (Admin only)
router.put('/:id', checkAdmin, intakeController.updateIntake);

// Delete intake (Admin only)
router.delete('/:id', checkAdmin, intakeController.deleteIntake);

module.exports = router;

