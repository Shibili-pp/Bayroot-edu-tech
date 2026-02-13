const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkAdmin } = require('../middlewares/role.middleware');
const { authRateLimiter, generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { verifyAccountNotLocked } = require('../middlewares/accountLockout.middleware');

// Public routes with rate limiting
router.post('/send-signup-otp', generalRateLimiter, adminController.sendSignupOTP);
router.post('/register', generalRateLimiter, adminController.register);
router.post('/login', authRateLimiter, verifyAccountNotLocked, adminController.login);
router.post('/send-forgot-password-otp', generalRateLimiter, adminController.sendForgotPasswordOTP);
router.post('/reset-password', generalRateLimiter, adminController.resetPassword);

// Protected routes
router.get('/profile', generalRateLimiter, verifyToken, checkAdmin, adminController.getProfile);
router.post('/logout', generalRateLimiter, verifyToken, checkAdmin, adminController.logout);

module.exports = router;

