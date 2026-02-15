const Course = require('../models/Course.model');
const Country = require('../models/Country.model');
const University = require('../models/University.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

// Get all courses (Admin can see all, including inactive)
const getAllCourses = async (req, res) => {
  try {
    const role = req.user.role;
    const query = role === 'ADMIN' ? {} : { isActive: true };
    
    const courses = await Course.find(query)
      .populate('countryId', 'name code')
      .populate('universityId', 'name country')
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
    const course = await Course.findById(id)
      .populate('countryId', 'name code')
      .populate('universityId', 'name country');
    
    if (!course) {
      return sendError(res, 'Course not found', 404);
    }
    
    return sendSuccess(res, { course }, 'Course retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Create course (Admin only)
const createCourse = async (req, res) => {
  try {
    const { name, description, category, countryId, universityId } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can create courses', 403);
    }

    if (!name || !countryId || !universityId) {
      return sendError(res, 'Name, country, and university are required', 400);
    }

    // Validate country exists
    const country = await Country.findById(countryId);
    if (!country || !country.isActive) {
      return sendError(res, 'Invalid or inactive country', 400);
    }

    // Validate university exists
    const university = await University.findById(universityId);
    if (!university || !university.isActive) {
      return sendError(res, 'Invalid or inactive university', 400);
    }

    // Check if course with same name already exists
    const existing = await Course.findOne({ name: name.trim() });
    if (existing) {
      return sendError(res, 'Course with this name already exists', 400);
    }

    const course = new Course({
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '',
      countryId,
      universityId,
      isActive: true
    });

    await course.save();
    await course.populate('countryId', 'name code');
    await course.populate('universityId', 'name country');

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'CREATE_COURSE',
      targetId: course._id,
      targetModel: 'Course',
      metadata: { name: course.name, country: country.name, university: university.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { course }, 'Course created successfully', 201);
  } catch (error) {
    console.error('Create course error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Course with this name already exists', 400);
    }
    return sendError(res, error.message || 'Failed to create course', 500);
  }
};

// Update course (Admin only)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, countryId, universityId, isActive } = req.body;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can update courses', 403);
    }

    const course = await Course.findById(id);
    if (!course) {
      return sendError(res, 'Course not found', 404);
    }

    // Validate country if being updated
    if (countryId) {
      const country = await Country.findById(countryId);
      if (!country || !country.isActive) {
        return sendError(res, 'Invalid or inactive country', 400);
      }
    }

    // Validate university if being updated
    if (universityId) {
      const university = await University.findById(universityId);
      if (!university || !university.isActive) {
        return sendError(res, 'Invalid or inactive university', 400);
      }
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== course.name) {
      const existing = await Course.findOne({ name: name.trim() });
      if (existing) {
        return sendError(res, 'Course with this name already exists', 400);
      }
      course.name = name.trim();
    }

    if (description !== undefined) course.description = description.trim();
    if (category !== undefined) course.category = category.trim();
    if (countryId) course.countryId = countryId;
    if (universityId) course.universityId = universityId;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();
    await course.populate('countryId', 'name code');
    await course.populate('universityId', 'name country');

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPDATE_COURSE',
      targetId: course._id,
      targetModel: 'Course',
      metadata: { name: course.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { course }, 'Course updated successfully');
  } catch (error) {
    console.error('Update course error:', error);
    if (error.code === 11000) {
      return sendError(res, 'Course with this name already exists', 400);
    }
    return sendError(res, error.message || 'Failed to update course', 500);
  }
};

// Delete course (Admin only)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can delete courses', 403);
    }

    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return sendError(res, 'Course not found', 404);
    }

    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_COURSE',
      targetId: id,
      targetModel: 'Course',
      metadata: { name: course.name },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Course deleted successfully');
  } catch (error) {
    console.error('Delete course error:', error);
    return sendError(res, error.message || 'Failed to delete course', 500);
  }
};

module.exports = {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
};
