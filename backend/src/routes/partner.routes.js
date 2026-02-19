const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { checkPartner, checkAdmin, checkPartnerApproved } = require('../middlewares/role.middleware');
const { authRateLimiter, generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { verifyAccountNotLocked } = require('../middlewares/accountLockout.middleware');

// Public routes with rate limiting
router.post('/send-signup-otp', generalRateLimiter, partnerController.sendSignupOTP);
router.post('/register', generalRateLimiter, partnerController.register);
router.post('/login', authRateLimiter, verifyAccountNotLocked, partnerController.login);
router.post('/send-forgot-password-otp', generalRateLimiter, partnerController.sendForgotPasswordOTP);
router.post('/reset-password', generalRateLimiter, partnerController.resetPassword);

// Protected routes (check approval status - doesn't require approval)
router.get('/approval-status', generalRateLimiter, verifyToken, checkPartner, partnerController.checkApprovalStatus);

// Protected routes (require approval)
router.get('/profile', generalRateLimiter, verifyToken, checkPartner, checkPartnerApproved, partnerController.getProfile);
router.post('/logout', generalRateLimiter, verifyToken, checkPartner, partnerController.logout);

// Admin only routes
router.get('/', generalRateLimiter, verifyToken, checkAdmin, partnerController.getAllPartners);
router.put('/:id/approve', generalRateLimiter, verifyToken, checkAdmin, partnerController.approvePartner);
router.put('/:id/reject', generalRateLimiter, verifyToken, checkAdmin, partnerController.rejectPartner);

module.exports = router;

