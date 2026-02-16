const Country = require('../models/Country.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

// Get all countries (Admin can see all, including inactive)
const getAllCountries = async (req, res) => {
  try {
    const role = req.user.role;
    const query = role === 'ADMIN' ? {} : { isActive: true };
    
    const countries = await Country.find(query)
      .sort({ name: 1 });
    
    return sendSuccess(res, { countries }, 'Countries retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get single country
const getCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findById(id);
    
    if (!country) {
      return sendError(res, 'Country not found', 404);
    }
    
    return sendSuccess(res, { country }, 'Country retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Create country (Admin only)
const createCountry = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create countries', 403);
    }

    if (!name || !code) {
      return sendError(res, 'Name and code are required', 400);
    }

    // Check if country with same name or code already exists
    const existingName = await Country.findOne({ name: name.trim() });
    if (existingName) {
      return sendError(res, 'Country with this name already exists', 400);
    }

    const existingCode = await Country.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return sendError(res, 'Country with this code already exists', 400);
    }

    const country = new Country({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
      isActive: true
    });

    await country.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_COUNTRY',
      targetId: country._id,
      targetModel: 'Country',
      metadata: { name: country.name, code: country.code },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { country }, 'Country created successfully', 201);
  } catch (error) {
    console.error('Create country error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Country with this name or code already exists', 400);
    }
    return sendError(res, error.message || 'Failed to create country', 500);
  }
};

// Update country (Admin only)
const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update countries', 403);
    }

    const country = await Country.findById(id);
    if (!country) {
      return sendError(res, 'Country not found', 404);
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== country.name) {
      const existing = await Country.findOne({ name: name.trim() });
      if (existing) {
        return sendError(res, 'Country with this name already exists', 400);
      }
      country.name = name.trim();
    }

    // Check if code is being changed and if it conflicts
    if (code && code.trim().toUpperCase() !== country.code) {
      const existing = await Country.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return sendError(res, 'Country with this code already exists', 400);
      }
      country.code = code.trim().toUpperCase();
    }

    if (description !== undefined) country.description = description.trim();
    if (isActive !== undefined) country.isActive = isActive;

    await country.save();

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_COUNTRY',
      targetId: country._id,
      targetModel: 'Country',
      metadata: { name: country.name, code: country.code },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { country }, 'Country updated successfully');
  } catch (error) {
    console.error('Update country error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Country with this name or code already exists', 400);
    }
    return sendError(res, error.message || 'Failed to update country', 500);
  }
};

// Delete country (Admin only)
const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete countries', 403);
    }

    const country = await Country.findByIdAndDelete(id);
    if (!country) {
      return sendError(res, 'Country not found', 404);
    }

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_COUNTRY',
      targetId: id,
      targetModel: 'Country',
      metadata: { name: country.name, code: country.code },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Country deleted successfully');
  } catch (error) {
    console.error('Delete country error:', error);
    return sendError(res, error.message || 'Failed to delete country', 500);
  }
};

module.exports = {
  getAllCountries,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry
};




