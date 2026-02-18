const University = require('../models/University.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

// Get all universities (Admin can see all, including inactive)
const getAllUniversities = async (req, res) => {
  try {
    const role = req.user.role;
    const query = role === 'ADMIN' ? {} : { isActive: true };
    
    const universities = await University.find(query)
      .sort({ name: 1 });
    
    return sendSuccess(res, { universities }, 'Universities retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get single university
const getUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const university = await University.findById(id);
    
    if (!university) {
      return sendError(res, 'University not found', 404);
    }
    
    return sendSuccess(res, { university }, 'University retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Create university (Admin only)
const createUniversity = async (req, res) => {
  try {
    const { name, country, location, description, requiredDocuments } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create universities', 403);
    }

    if (!name || !country) {
      return sendError(res, 'Name and country are required', 400);
    }

    // Check if university with same name already exists
    const existing = await University.findOne({ name: name.trim() });
    if (existing) {
      return sendError(res, 'University with this name already exists', 400);
    }

    const university = new University({
      name: name.trim(),
      country: country.trim(),
      location: location?.trim() || '',
      description: description?.trim() || '',
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments.filter(doc => doc && doc.trim()) : [],
      isActive: true
    });

    await university.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_UNIVERSITY',
      targetId: university._id,
      targetModel: 'University',
      metadata: { name: university.name, country: university.country },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { university }, 'University created successfully', 201);
  } catch (error) {
    console.error('Create university error:', error);
    if (error.code === 11000) {
      return sendError(res, 'University with this name already exists', 400);
    }
    return sendError(res, error.message || 'Failed to create university', 500);
  }
};

// Update university (Admin only)
const updateUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, location, description, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update universities', 403);
    }

    const university = await University.findById(id);
    if (!university) {
      return sendError(res, 'University not found', 404);
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== university.name) {
      const existing = await University.findOne({ name: name.trim() });
      if (existing) {
        return sendError(res, 'University with this name already exists', 400);
      }
      university.name = name.trim();
    }

    if (country) university.country = country.trim();
    if (location !== undefined) university.location = location.trim();
    if (description !== undefined) university.description = description.trim();
    if (isActive !== undefined) university.isActive = isActive;

    await university.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_UNIVERSITY',
      targetId: university._id,
      targetModel: 'University',
      metadata: { name: university.name, country: university.country },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { university }, 'University updated successfully');
  } catch (error) {
    console.error('Update university error:', error);
    if (error.code === 11000) {
      return sendError(res, 'University with this name already exists', 400);
    }
    return sendError(res, error.message || 'Failed to update university', 500);
  }
};

// Delete university (Admin only)
const deleteUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete universities', 403);
    }

    const university = await University.findByIdAndDelete(id);
    if (!university) {
      return sendError(res, 'University not found', 404);
    }

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_UNIVERSITY',
      targetId: id,
      targetModel: 'University',
      metadata: { name: university.name, country: university.country },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'University deleted successfully');
  } catch (error) {
    console.error('Delete university error:', error);
    return sendError(res, error.message || 'Failed to delete university', 500);
  }
};

module.exports = {
  getAllUniversities,
  getUniversity,
  createUniversity,
  updateUniversity,
  deleteUniversity
};

