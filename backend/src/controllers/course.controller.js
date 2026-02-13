const Course = require('../models/Course.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// Get all active courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .sort({ name: 1 });
    
    return sendSuccess(res, { courses }, 'Courses retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get single course
const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    
    if (!course || !course.isActive) {
      return sendError(res, 'Course not found', 404);
    }
    
    return sendSuccess(res, { course }, 'Course retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllCourses,
  getCourse
};

