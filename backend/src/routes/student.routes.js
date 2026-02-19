const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const verifyToken = require('../middlewares/auth.middleware');
const { authorize, checkAdmin, checkPartnerApproved } = require('../middlewares/role.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { generalRateLimiter } = require('../middlewares/rateLimit.middleware');
const { parsePagination } = require('../middlewares/pagination.middleware');

// All student routes require authentication and rate limiting
router.use(generalRateLimiter);
router.use(verifyToken);

// Helper middleware to check approval for partners
const checkApprovalIfPartner = (req, res, next) => {
  if (req.user.role === 'PARTNER') {
    return checkPartnerApproved(req, res, next);
  }
  next();
};

// Partner can create students (Admin can create via direct DB if needed)
router.post('/', authorize('PARTNER'), checkPartnerApproved, studentController.createStudent);

// Partner and Admin can get all students (filtered by role) - with pagination
router.get('/', parsePagination, authorize('PARTNER', 'ADMIN'), checkApprovalIfPartner, studentController.getAllStudents);

// Partner and Admin can get single student
router.get('/:id', authorize('PARTNER', 'ADMIN'), checkApprovalIfPartner, studentController.getStudent);

// Partner and Admin can update student
router.put('/:id', authorize('PARTNER', 'ADMIN'), checkApprovalIfPartner, studentController.updateStudent);

// Partner and Admin can upload documents
router.post('/:id/documents', authorize('PARTNER', 'ADMIN'), checkApprovalIfPartner, upload.array('documents', 10), studentController.uploadDocuments);

// Only Admin can upload offer letter
router.post('/:id/offer-letter', checkAdmin, upload.single('offerLetter'), studentController.uploadOfferLetter);

// Only Admin can delete student
router.delete('/:id', checkAdmin, studentController.deleteStudent);

module.exports = router;

