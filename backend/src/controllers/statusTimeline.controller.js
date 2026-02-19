const StatusTimeline = require('../models/StatusTimeline.model');
const Student = require('../models/Student.model');
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

// Helper function to convert time value to hours
const convertToHours = (value, unit) => {
  switch (unit) {
    case 'minutes':
      return value / 60;
    case 'hours':
      return value;
    case 'days':
      return value * 24;
    default:
      return value; // Default to hours
  }
};

// Create timeline rule
const createTimelineRule = async (req, res) => {
  try {
    const { fromStatus, toStatus, timeValue, timeUnit, minHours, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create timeline rules', 403);
    }

    if (!fromStatus || !toStatus) {
      return sendError(res, 'From status and to status are required', 400);
    }

    if (fromStatus === toStatus) {
      return sendError(res, 'From status and to status cannot be the same', 400);
    }

    // Support both old format (minHours) and new format (timeValue + timeUnit)
    let finalTimeValue = 0;
    let finalTimeUnit = 'hours';
    let finalMinHours = 0;

    if (timeValue !== undefined && timeUnit) {
      // New format: timeValue + timeUnit
      finalTimeValue = parseFloat(timeValue);
      finalTimeUnit = timeUnit;
      if (finalTimeValue < 0) {
        return sendError(res, 'Time value must be 0 or greater', 400);
      }
      // Convert to hours for internal calculation
      finalMinHours = convertToHours(finalTimeValue, finalTimeUnit);
    } else if (minHours !== undefined) {
      // Old format: minHours (backward compatibility)
      finalMinHours = parseFloat(minHours);
      finalTimeValue = finalMinHours;
      finalTimeUnit = 'hours';
      if (finalMinHours < 0) {
        return sendError(res, 'Minimum hours must be 0 or greater', 400);
      }
    } else {
      return sendError(res, 'Time value and unit (or minimum hours) are required', 400);
    }

    // Check if rule already exists
    const existing = await StatusTimeline.findOne({ fromStatus, toStatus });
    if (existing) {
      return sendError(res, 'Timeline rule for this status transition already exists', 400);
    }

    const rule = new StatusTimeline({
      fromStatus,
      toStatus,
      minHours: finalMinHours, // Store in hours for calculations
      timeValue: finalTimeValue, // Store original value
      timeUnit: finalTimeUnit, // Store unit
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
    const { fromStatus, toStatus, timeValue, timeUnit, minHours, isActive } = req.body;
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

    // Handle time value updates (new format)
    if (timeValue !== undefined && timeUnit) {
      const finalTimeValue = parseFloat(timeValue);
      if (finalTimeValue < 0) {
        return sendError(res, 'Time value must be 0 or greater', 400);
      }
      rule.timeValue = finalTimeValue;
      rule.timeUnit = timeUnit;
      rule.minHours = convertToHours(finalTimeValue, timeUnit);
    } else if (minHours !== undefined) {
      // Backward compatibility: update minHours
      if (minHours < 0) {
        return sendError(res, 'Minimum hours must be 0 or greater', 400);
      }
      rule.minHours = parseFloat(minHours);
      // If timeValue/timeUnit not set, default to hours
      if (!rule.timeValue) {
        rule.timeValue = minHours;
        rule.timeUnit = 'hours';
      }
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

// Get pending status updates (students that have exceeded minimum hours)
const getPendingStatusUpdates = async (req, res) => {
  try {
    // Get all active timeline rules
    const rules = await StatusTimeline.find({ isActive: true });
    
    console.log(`Found ${rules.length} active timeline rules`);
    
    if (rules.length === 0) {
      console.log('No active timeline rules found');
      return sendSuccess(res, { pendingStudents: [] }, 'No pending status updates');
    }

    const pendingStudents = [];
    const now = new Date();

    // For each rule, find students that need status update
    for (const rule of rules) {
      console.log(`\n=== Checking rule: ${rule.fromStatus} -> ${rule.toStatus} ===`);
      console.log(`  Rule timeValue: ${rule.timeValue}, timeUnit: ${rule.timeUnit}`);
      console.log(`  Rule minHours (converted): ${rule.minHours} hours (${rule.minHours * 60} minutes)`);
      console.log(`  Rule isActive: ${rule.isActive}`);
      
      if (rule.minHours <= 0) {
        console.log(`Skipping rule with minHours <= 0: ${rule.minHours}`);
        continue; // Skip rules with 0 hours
      }
      
      if (!rule.isActive) {
        console.log(`Skipping inactive rule`);
        continue;
      }

      // Find students with the fromStatus
      const students = await Student.find({
        status: rule.fromStatus,
        isDeleted: false
      })
        .populate('universityId', 'name')
        .populate('courseId', 'name')
        .populate('partnerId', 'companyName')
        .select('fullName status statusUpdatedAt createdAt universityId courseId partnerId _id');

      console.log(`Found ${students.length} students with status "${rule.fromStatus}"`);

      for (const student of students) {
        // Use statusUpdatedAt if available, otherwise use createdAt
        // For students created before statusUpdatedAt was added, use createdAt
        let statusUpdatedAt = student.statusUpdatedAt;
        
        // If statusUpdatedAt is null/undefined/invalid, use createdAt
        // This handles students created before statusUpdatedAt field was added
        if (!statusUpdatedAt || isNaN(new Date(statusUpdatedAt).getTime())) {
          statusUpdatedAt = student.createdAt;
          console.log(`Student ${student.fullName}: Using createdAt (${student.createdAt}) as statusUpdatedAt`);
        }
        
        const statusDate = new Date(statusUpdatedAt);
        const hoursSinceUpdate = (now - statusDate) / (1000 * 60 * 60);
        const minutesSinceUpdate = hoursSinceUpdate * 60;

        // Debug logging - show all relevant info
        console.log(`\n--- Checking Student: ${student.fullName} ---`);
        console.log(`  Status: ${student.status}`);
        console.log(`  statusUpdatedAt: ${statusUpdatedAt}`);
        console.log(`  createdAt: ${student.createdAt}`);
        console.log(`  Time since status update: ${minutesSinceUpdate.toFixed(2)} minutes (${hoursSinceUpdate.toFixed(4)} hours)`);
        console.log(`  Rule: ${rule.fromStatus} -> ${rule.toStatus}`);
        console.log(`  Rule timeValue: ${rule.timeValue}, timeUnit: ${rule.timeUnit}`);
        console.log(`  Required minHours (converted): ${rule.minHours} hours (${rule.minHours * 60} minutes)`);
        console.log(`  Comparison: ${minutesSinceUpdate.toFixed(2)} minutes >= ${rule.minHours * 60} minutes = ${minutesSinceUpdate >= (rule.minHours * 60) ? 'YES ✓' : 'NO ✗'}`);
        console.log(`  Should alert: ${hoursSinceUpdate >= rule.minHours ? 'YES ✓' : 'NO ✗'}`);

        // Check if minimum time has passed (use >= to include exact match)
        // Compare in hours (both converted to hours)
        if (hoursSinceUpdate >= rule.minHours) {
          console.log(`  → ADDING to pending list`);
          
          // Calculate elapsed time in the same unit as the rule for display
          let elapsedDisplay = hoursSinceUpdate;
          let elapsedUnit = 'hours';
          if (rule.timeUnit === 'minutes') {
            elapsedDisplay = minutesSinceUpdate;
            elapsedUnit = 'minutes';
          } else if (rule.timeUnit === 'days') {
            elapsedDisplay = hoursSinceUpdate / 24;
            elapsedUnit = 'days';
          }
          
          pendingStudents.push({
            studentId: student._id,
            studentName: student.fullName,
            currentStatus: student.status,
            nextStatus: rule.toStatus,
            hoursElapsed: hoursSinceUpdate, // Keep in hours for calculations
            minutesElapsed: minutesSinceUpdate, // Also store in minutes
            elapsedDisplay: Math.floor(elapsedDisplay * 10) / 10, // Round to 1 decimal place
            elapsedUnit: elapsedUnit,
            timeValue: rule.timeValue,
            timeUnit: rule.timeUnit,
            minHours: rule.minHours,
            statusUpdatedAt: statusUpdatedAt,
            university: student.universityId?.name || 'N/A',
            course: student.courseId?.name || 'N/A',
            partner: student.partnerId?.companyName || 'N/A'
          });
        }
      }
    }

    console.log(`Total pending students found: ${pendingStudents.length}`);

    // Keep all students - don't remove duplicates
    // If a student matches multiple rules, they'll appear multiple times (which is fine)
    // This allows admins to see all possible next statuses for each student
    const finalPendingStudents = pendingStudents;

    console.log(`Returning ${finalPendingStudents.length} pending students`);

    return sendSuccess(res, { pendingStudents: finalPendingStudents }, 'Pending status updates retrieved successfully');
  } catch (error) {
    console.error('Get pending status updates error:', error);
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllTimelineRules,
  getTimelineRule,
  createTimelineRule,
  updateTimelineRule,
  deleteTimelineRule,
  getTimelineRuleForTransition,
  getPendingStatusUpdates
};


