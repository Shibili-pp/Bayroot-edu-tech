const Intake = require('../models/Intake.model');
const Country = require('../models/Country.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

// Get all intakes (Admin can see all, including inactive)
const getAllIntakes = async (req, res) => {
  try {
    const role = req.user.role;
    const query = role === 'ADMIN' ? {} : { isActive: true };
    
    const intakes = await Intake.find(query)
      .populate('countryId', 'name code')
      .sort({ name: 1 });
    
    return sendSuccess(res, { intakes }, 'Intakes retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get single intake
const getIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const intake = await Intake.findById(id).populate('countryId', 'name code');
    
    if (!intake) {
      return sendError(res, 'Intake not found', 404);
    }
    
    return sendSuccess(res, { intake }, 'Intake retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Create intake (Admin only)
const createIntake = async (req, res) => {
  try {
    const { name, countryId } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create intakes', 403);
    }

    if (!name || !countryId) {
      return sendError(res, 'Name and country are required', 400);
    }

    // Validate country exists
    const country = await Country.findById(countryId);
    if (!country || !country.isActive) {
      return sendError(res, 'Invalid or inactive country', 400);
    }

    // Check if intake with same name already exists for this country
    const existing = await Intake.findOne({ 
      name: name.trim(), 
      countryId: countryId 
    });
    if (existing) {
      return sendError(res, 'Intake with this name already exists for this country', 400);
    }

    const intake = new Intake({
      name: name.trim(),
      countryId: countryId,
      isActive: true
    });

    await intake.save();
    await intake.populate('countryId', 'name code');

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_INTAKE',
      targetId: intake._id,
      targetModel: 'Intake',
      metadata: { name: intake.name, country: country.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { intake }, 'Intake created successfully', 201);
  } catch (error) {
    console.error('Create intake error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Intake with this name already exists for this country', 400);
    }
    return sendError(res, error.message || 'Failed to create intake', 500);
  }
};

// Update intake (Admin only)
const updateIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, countryId, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update intakes', 403);
    }

    const intake = await Intake.findById(id);
    if (!intake) {
      return sendError(res, 'Intake not found', 404);
    }

    // Validate country if being changed
    if (countryId && countryId !== intake.countryId.toString()) {
      const country = await Country.findById(countryId);
      if (!country || !country.isActive) {
        return sendError(res, 'Invalid or inactive country', 400);
      }
      intake.countryId = countryId;
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== intake.name) {
      const existing = await Intake.findOne({ 
        name: name.trim(), 
        countryId: intake.countryId 
      });
      if (existing && existing._id.toString() !== id) {
        return sendError(res, 'Intake with this name already exists for this country', 400);
      }
      intake.name = name.trim();
    }

    if (isActive !== undefined) intake.isActive = isActive;

    await intake.save();
    await intake.populate('countryId', 'name code');

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_INTAKE',
      targetId: intake._id,
      targetModel: 'Intake',
      metadata: { name: intake.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { intake }, 'Intake updated successfully');
  } catch (error) {
    console.error('Update intake error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Intake with this name already exists for this country', 400);
    }
    return sendError(res, error.message || 'Failed to update intake', 500);
  }
};

// Delete intake (Admin only)
const deleteIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete intakes', 403);
    }

    const intake = await Intake.findByIdAndDelete(id);
    if (!intake) {
      return sendError(res, 'Intake not found', 404);
    }

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_INTAKE',
      targetId: id,
      targetModel: 'Intake',
      metadata: { name: intake.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Intake deleted successfully');
  } catch (error) {
    console.error('Delete intake error:', error);
    return sendError(res, error.message || 'Failed to delete intake', 500);
  }
};

module.exports = {
  getAllIntakes,
  getIntake,
  createIntake,
  updateIntake,
  deleteIntake
};


