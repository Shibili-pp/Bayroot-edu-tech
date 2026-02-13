const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkPartner } = require('../middlewares/role.middleware');
const { authRateLimiter, generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { verifyAccountNotLocked } = require('../middlewares/accountLockout.middleware');

// Public routes with rate limiting
router.post('/send-signup-otp', generalRateLimiter, partnerController.sendSignupOTP);
router.post('/register', generalRateLimiter, partnerController.register);
router.post('/login', authRateLimiter, verifyAccountNotLocked, partnerController.login);
router.post('/send-forgot-password-otp', generalRateLimiter, partnerController.sendForgotPasswordOTP);
router.post('/reset-password', generalRateLimiter, partnerController.resetPassword);

// Protected routes
router.get('/profile', generalRateLimiter, verifyToken, checkPartner, partnerController.getProfile);
router.post('/logout', generalRateLimiter, verifyToken, checkPartner, partnerController.logout);

module.exports = router;

