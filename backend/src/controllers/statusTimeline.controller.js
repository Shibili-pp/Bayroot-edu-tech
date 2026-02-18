const StatusTimeline = require('../models/StatusTimeline.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

// Get all timeline rules
const getAllTimelineRules = async (req, res) => {
  try {
    const rules = await StatusTimeline.find()
      .populate('createdBy', 'name email')
      .sort({ fromStatus: 1, toStatus: 1 });

    return sendSuccess(res, { rules }, 'Timeline rules retrieved successfully');
  } catch (error) {
    console.error('Get timeline rules error:', error);
    return sendError(res, error.message, 500);
  }
};

// Get single timeline rule
const getTimelineRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await StatusTimeline.findById(id)
      .populate('createdBy', 'name email');

    if (!rule) {
      return sendError(res, 'Timeline rule not found', 404);
    }

    return sendSuccess(res, { rule }, 'Timeline rule retrieved successfully');
  } catch (error) {
    console.error('Get timeline rule error:', error);
    return sendError(res, error.message, 500);
  }
};

// Create timeline rule
const createTimelineRule = async (req, res) => {
  try {
    const { fromStatus, toStatus, minHours, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create timeline rules', 403);
    }

    if (!fromStatus || !toStatus || minHours === undefined) {
      return sendError(res, 'From status, to status, and minimum hours are required', 400);
    }

    if (fromStatus === toStatus) {
      return sendError(res, 'From status and to status cannot be the same', 400);
    }

    if (minHours < 0) {
      return sendError(res, 'Minimum hours must be 0 or greater', 400);
    }

    // Check if rule already exists
    const existing = await StatusTimeline.findOne({ fromStatus, toStatus });
    if (existing) {
      return sendError(res, 'Timeline rule for this status transition already exists', 400);
    }

    const rule = new StatusTimeline({
      fromStatus,
      toStatus,
      minHours: parseInt(minHours),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userId
    });

    await rule.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_STATUS_TIMELINE',
      targetId: rule._id,
      targetModel: 'StatusTimeline',
      metadata: { fromStatus, toStatus, minHours },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { rule }, 'Timeline rule created successfully', 201);
  } catch (error) {
    console.error('Create timeline rule error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Timeline rule for this status transition already exists', 400);
    }
    return sendError(res, error.message || 'Failed to create timeline rule', 500);
  }
};

// Update timeline rule
const updateTimelineRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromStatus, toStatus, minHours, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update timeline rules', 403);
    }

    const rule = await StatusTimeline.findById(id);
    if (!rule) {
      return sendError(res, 'Timeline rule not found', 404);
    }

    if (fromStatus && toStatus && fromStatus === toStatus) {
      return sendError(res, 'From status and to status cannot be the same', 400);
    }

    if (minHours !== undefined && minHours < 0) {
      return sendError(res, 'Minimum hours must be 0 or greater', 400);
    }

    // Check if updating would create a duplicate
    if (fromStatus || toStatus) {
      const checkFromStatus = fromStatus || rule.fromStatus;
      const checkToStatus = toStatus || rule.toStatus;
      const existing = await StatusTimeline.findOne({ 
        fromStatus: checkFromStatus, 
        toStatus: checkToStatus,
        _id: { $ne: id }
      });
      if (existing) {
        return sendError(res, 'Timeline rule for this status transition already exists', 400);
      }
    }

    if (fromStatus) rule.fromStatus = fromStatus;
    if (toStatus) rule.toStatus = toStatus;
    if (minHours !== undefined) rule.minHours = parseInt(minHours);
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_STATUS_TIMELINE',
      targetId: rule._id,
      targetModel: 'StatusTimeline',
      metadata: { fromStatus: rule.fromStatus, toStatus: rule.toStatus, minHours: rule.minHours },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { rule }, 'Timeline rule updated successfully');
  } catch (error) {
    console.error('Update timeline rule error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Timeline rule for this status transition already exists', 400);
    }
    return sendError(res, error.message || 'Failed to update timeline rule', 500);
  }
};

// Delete timeline rule
const deleteTimelineRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete timeline rules', 403);
    }

    const rule = await StatusTimeline.findByIdAndDelete(id);
    if (!rule) {
      return sendError(res, 'Timeline rule not found', 404);
    }

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_STATUS_TIMELINE',
      targetId: id,
      targetModel: 'StatusTimeline',
      metadata: { fromStatus: rule.fromStatus, toStatus: rule.toStatus },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Timeline rule deleted successfully');
  } catch (error) {
    console.error('Delete timeline rule error:', error);
    return sendError(res, error.message || 'Failed to delete timeline rule', 500);
  }
};

// Get timeline rule for status transition
const getTimelineRuleForTransition = async (req, res) => {
  try {
    const { fromStatus, toStatus } = req.query;

    if (!fromStatus || !toStatus) {
      return sendError(res, 'From status and to status are required', 400);
    }

    const rule = await StatusTimeline.findOne({
      fromStatus,
      toStatus,
      isActive: true
    });

    return sendSuccess(res, { rule }, 'Timeline rule retrieved successfully');
  } catch (error) {
    console.error('Get timeline rule for transition error:', error);
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllTimelineRules,
  getTimelineRule,
  createTimelineRule,
  updateTimelineRule,
  deleteTimelineRule,
  getTimelineRuleForTransition
};

