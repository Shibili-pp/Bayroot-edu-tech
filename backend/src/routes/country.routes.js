const express = require('express');
const router = express.Router();
const countryController = require('../controllers/country.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');

// All country routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Get all countries
router.get('/', countryController.getAllCountries);

// Create country (Admin only)
router.post('/', checkAdmin, countryController.createCountry);

// Get single country
router.get('/:id', countryController.getCountry);

// Update country (Admin only)
router.put('/:id', checkAdmin, countryController.updateCountry);

// Delete country (Admin only)
router.delete('/:id', checkAdmin, countryController.deleteCountry);

module.exports = router;




