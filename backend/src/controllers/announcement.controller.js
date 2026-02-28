const Announcement = require('../models/Announcement.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { uploadToS3 } = require('../services/s3.service');
const { getPresignedUrl } = require('../services/s3.service');
const { getFileType } = require('../middlewares/upload.middleware');

/**
 * Create new announcement
 * POST /api/announcements
 */
const createAnnouncement = async (req, res) => {
  try {
    let { content, category, hiddenFromPartners } = req.body;
    if (typeof hiddenFromPartners === 'string') {
      try {
        hiddenFromPartners = JSON.parse(hiddenFromPartners);
      } catch {
        hiddenFromPartners = [];
      }
    }
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Only admin can create announcements
    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create announcements', 403);
    }

    // Validate required fields
    if (!content || !content.trim()) {
      return sendError(res, 'Announcement content is required', 400);
    }

    if (!category || !['reminder', 'urgent', 'critical'].includes(category)) {
      return sendError(res, 'Valid category is required (reminder, urgent, or critical)', 400);
    }

    // Handle optional image upload
    let imageData = null;
    if (req.file) {
      const fileType = getFileType(req.file.mimetype);
      if (!fileType || fileType !== 'image') {
        return sendError(res, 'Invalid image type. Only JPG, PNG, JPEG, or WebP are allowed.', 400);
      }
      const maxSize = 5 * 1024 * 1024; // 5MB for announcement images
      if (req.file.size > maxSize) {
        return sendError(res, 'Image exceeds maximum size of 5MB', 400);
      }
      const { s3Key, s3Url, fileName } = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        'image',
        req.file.mimetype
      );
      imageData = {
        s3Key,
        s3Url,
        originalName: req.file.originalname
      };
    }

    // Create announcement
    const announcement = new Announcement({
      content: content.trim(),
      category,
      hiddenFromPartners: hiddenFromPartners || [],
      createdBy: userId,
      ...(imageData && { image: imageData })
    });

    await announcement.save();
    await announcement.populate('createdBy', 'name email');

    // Log audit
    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_ANNOUNCEMENT',
      targetId: announcement._id,
      targetModel: 'Announcement',
      metadata: {
        category,
        hiddenFromPartnersCount: hiddenFromPartners?.length || 0
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(
      res,
      { announcement },
      'Announcement created successfully',
      201
    );
  } catch (error) {
    console.error('Create announcement error:', error);
    return sendError(res, error.message || 'Failed to create announcement', 500);
  }
};

/**
 * Get all announcements (Admin only)
 * GET /api/announcements
 */
const getAllAnnouncements = async (req, res) => {
  try {
    const role = req.user.role;
    const { page = 1, limit = 20, category } = req.query;

    // Only admin can see all announcements
    if (role !== 'ADMIN') {
      return sendError(res, 'Access denied', 403);
    }

    const query = {};
    if (category && ['reminder', 'urgent', 'critical'].includes(category)) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email')
      .populate('hiddenFromPartners', 'companyName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add presigned image URL for announcements that have images
    for (const ann of announcements) {
      if (ann.image?.s3Key) {
        try {
          ann.image.imageUrl = await getPresignedUrl(ann.image.s3Key, 3600);
        } catch (err) {
          console.error('Failed to get presigned URL for announcement image:', err);
        }
      }
    }

    const total = await Announcement.countDocuments(query);

    return sendSuccess(res, {
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return sendError(res, error.message || 'Failed to get announcements', 500);
  }
};

/**
 * Get visible announcements for partner
 * GET /api/announcements/visible
 */
const getVisibleAnnouncements = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const { limit = 10 } = req.query;

    // Only partners can see visible announcements
    if (role !== 'PARTNER') {
      return sendError(res, 'Access denied', 403);
    }

    const mongoose = require('mongoose');
    const partnerObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    // Query directly to ensure proper ObjectId comparison
    const announcements = await Announcement.find({
      isActive: true,
      hiddenFromPartners: { $nin: [partnerObjectId] },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Add presigned image URL for announcements that have images
    for (const ann of announcements) {
      if (ann.image?.s3Key) {
        try {
          ann.image.imageUrl = await getPresignedUrl(ann.image.s3Key, 3600);
        } catch (err) {
          console.error('Failed to get presigned URL for announcement image:', err);
        }
      }
    }

    console.log(`Found ${announcements.length} visible announcements for partner ${userId}`);
    
    return sendSuccess(res, { announcements });
  } catch (error) {
    console.error('Get visible announcements error:', error);
    return sendError(res, error.message || 'Failed to get announcements', 500);
  }
};

/**
 * Get single announcement
 * GET /api/announcements/:id
 */
const getAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const userId = req.user.userId || req.user.id;

    const announcement = await Announcement.findById(id)
      .populate('createdBy', 'name email')
      .populate('hiddenFromPartners', 'companyName email');

    if (!announcement) {
      return sendError(res, 'Announcement not found', 404);
    }

    // Partners can only see if not hidden from them
    if (role === 'PARTNER') {
      if (announcement.hiddenFromPartners.some(p => p._id.toString() === userId)) {
        return sendError(res, 'Announcement not found', 404);
      }
    }

    return sendSuccess(res, { announcement });
  } catch (error) {
    console.error('Get announcement error:', error);
    return sendError(res, error.message || 'Failed to get announcement', 500);
  }
};

/**
 * Update announcement
 * PUT /api/announcements/:id
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category, hiddenFromPartners, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Only admin can update announcements
    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update announcements', 403);
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return sendError(res, 'Announcement not found', 404);
    }

    // Update fields
    if (content !== undefined) announcement.content = content.trim();
    if (category !== undefined && ['reminder', 'urgent', 'critical'].includes(category)) {
      announcement.category = category;
    }
    if (hiddenFromPartners !== undefined) {
      announcement.hiddenFromPartners = hiddenFromPartners;
    }
    if (isActive !== undefined) announcement.isActive = isActive;

    await announcement.save();
    await announcement.populate('createdBy', 'name email');
    await announcement.populate('hiddenFromPartners', 'companyName email');

    // Log audit
    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_ANNOUNCEMENT',
      targetId: announcement._id,
      targetModel: 'Announcement',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { announcement }, 'Announcement updated successfully');
  } catch (error) {
    console.error('Update announcement error:', error);
    return sendError(res, error.message || 'Failed to update announcement', 500);
  }
};

/**
 * Delete announcement
 * DELETE /api/announcements/:id
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Only admin can delete announcements
    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete announcements', 403);
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return sendError(res, 'Announcement not found', 404);
    }

    await Announcement.findByIdAndDelete(id);

    // Log audit
    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_ANNOUNCEMENT',
      targetId: id,
      targetModel: 'Announcement',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Announcement deleted successfully');
  } catch (error) {
    console.error('Delete announcement error:', error);
    return sendError(res, error.message || 'Failed to delete announcement', 500);
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getVisibleAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};

