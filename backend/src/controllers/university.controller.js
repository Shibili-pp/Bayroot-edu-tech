const University = require('../models/University.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// Get all active universities
const getAllUniversities = async (req, res) => {
  try {
    const universities = await University.find({ isActive: true })
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
    
    if (!university || !university.isActive) {
      return sendError(res, 'University not found', 404);
    }
    
    return sendSuccess(res, { university }, 'University retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllUniversities,
  getUniversity
};

