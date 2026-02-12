const Student = require('../models/Student.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { formatStudentResponse } = require('../utils/studentResponse.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { v4: uuidv4 } = require('uuid');

// Create Student
const createStudent = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    // Only Partner can create students (Admin can create via direct DB if needed)
    if (role !== 'PARTNER') {
      return sendError(res, 'Only partners can create students', 403);
    }

    const { fullName, email, phone, passportNumber, countryPreference, coursePreference, intake } = req.body;
    
    const student = new Student({
      fullName,
      email,
      phone,
      passportNumber,
      countryPreference,
      coursePreference,
      intake,
      partnerId: userId
    });

    await student.save();
    await student.populate('partnerId', 'companyName email');

    // Log audit
    await logAudit({
      userId,
      userModel: 'Partner',
      role,
      action: 'CREATE_STUDENT',
      targetId: student._id,
      targetModel: 'Student',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudent = formatStudentResponse(student, role);
    return sendSuccess(res, { student: formattedStudent }, 'Student created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get all students (for partner - only their students, for admin - all students)
const getAllStudents = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const { page = 1, limit = 20 } = req.pagination || {};
    
    // Build query - exclude deleted records and filter by role
    const query = { isDeleted: false };
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    // Get total count for pagination
    const total = await Student.countDocuments(query);
    
    // Fetch paginated students
    const students = await Student.find(query)
      .populate('partnerId', 'companyName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'VIEW_STUDENT',
      metadata: { count: students.length, page, limit, listView: true },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudents = students.map(student => formatStudentResponse(student, role));
    return sendSuccess(res, {
      students: formattedStudents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Students retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Get single student
const getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    const query = { _id: id, isDeleted: false };
    
    // Partner can only access their own students
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query).populate('partnerId', 'companyName email');
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'VIEW_STUDENT',
      targetId: student._id,
      targetModel: 'Student',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudent = formatStudentResponse(student, role);
    return sendSuccess(res, { student: formattedStudent }, 'Student retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    const query = { _id: id, isDeleted: false };
    
    // Partner can only update their own students
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    const { fullName, email, phone, passportNumber, countryPreference, coursePreference, intake } = req.body;
    
    // Update fields (encryption handled by model hooks)
    if (fullName !== undefined) student.fullName = fullName;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (passportNumber !== undefined) student.passportNumber = passportNumber;
    if (countryPreference !== undefined) student.countryPreference = countryPreference;
    if (coursePreference !== undefined) student.coursePreference = coursePreference;
    if (intake !== undefined) student.intake = intake;

    await student.save();
    await student.populate('partnerId', 'companyName email');

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'UPDATE_STUDENT',
      targetId: student._id,
      targetModel: 'Student',
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudent = formatStudentResponse(student, role);
    return sendSuccess(res, { student: formattedStudent }, 'Student updated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Upload documents for student
const uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    const query = { _id: id, isDeleted: false };
    
    // Partner can only upload for their own students
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }

    const documents = req.files.map(file => {
      let fileType = 'pdf';
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        fileType = 'video';
      }

      return {
        fileId: uuidv4(), // Generate UUID for secure file access
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        fileType
      };
    });

    student.documents.push(...documents);
    await student.save();

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'UPLOAD_DOCUMENT',
      targetId: student._id,
      targetModel: 'Student',
      metadata: { fileCount: documents.length },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudent = formatStudentResponse(student, role);
    return sendSuccess(res, { student: formattedStudent }, 'Documents uploaded successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Delete student (Admin only) - Soft delete
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    // Only Admin can delete students
    if (role !== 'ADMIN') {
      return sendError(res, 'Access denied. Only administrators can delete students.', 403);
    }

    const student = await Student.findOne({ _id: id, isDeleted: false });
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Soft delete
    student.isDeleted = true;
    student.deletedAt = new Date();
    await student.save();

    // Log audit
    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'DELETE_STUDENT',
      targetId: student._id,
      targetModel: 'Student',
      metadata: { softDelete: true },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Student deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  uploadDocuments,
  deleteStudent
};

