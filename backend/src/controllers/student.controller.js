const Student = require('../models/Student.model');
const Course = require('../models/Course.model');
const University = require('../models/University.model');
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

    const { fullName, email, phone, passportNumber, aadharNumber, courseId, universityId, documents } = req.body;
    
    // Validate required fields
    if (!fullName || !email || !phone || !aadharNumber || !courseId || !universityId) {
      return sendError(res, 'Missing required fields: fullName, email, phone, aadharNumber, courseId, universityId', 400);
    }

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course || !course.isActive) {
      return sendError(res, 'Invalid or inactive course', 400);
    }

    // Validate university exists
    const university = await University.findById(universityId);
    if (!university || !university.isActive) {
      return sendError(res, 'Invalid or inactive university', 400);
    }

    // Process documents (can be URLs or file uploads)
    const processedDocuments = (documents || []).map(doc => {
      if (typeof doc === 'string') {
        // If it's a URL string
        return {
          fileId: uuidv4(),
          url: doc,
          fileType: doc.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
          originalName: doc.split('/').pop() || 'document'
        };
      } else if (doc.fileId && doc.path) {
        // If it's a file upload object with fileId and path
        return {
          fileId: doc.fileId,
          filename: doc.filename,
          originalName: doc.originalName,
          path: doc.path,
          fileType: doc.fileType,
          url: doc.url || `/api/files/${doc.fileId}`
        };
      } else if (doc.url) {
        // If it's an object with URL only
        return {
          fileId: uuidv4(),
          url: doc.url,
          fileType: doc.fileType || (doc.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
          originalName: doc.originalName || doc.url.split('/').pop() || 'document'
        };
      }
      return null;
    }).filter(Boolean);
    
    const student = new Student({
      fullName,
      email,
      phone,
      passportNumber: passportNumber || null,
      aadharNumber,
      courseId,
      universityId,
      partnerId: userId,
      documents: processedDocuments
    });

    await student.save();
    await student.populate('partnerId', 'companyName email');
    await student.populate('courseId', 'name description');
    await student.populate('universityId', 'name country');

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
      .populate('courseId', 'name description')
      .populate('universityId', 'name country')
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

    const student = await Student.findOne(query)
      .populate('partnerId', 'companyName email')
      .populate('courseId', 'name description')
      .populate('universityId', 'name country');
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

    const { fullName, email, phone, passportNumber, aadharNumber, courseId, universityId, documents } = req.body;
    
    // Update fields (encryption handled by model hooks)
    if (fullName !== undefined) student.fullName = fullName;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (passportNumber !== undefined) student.passportNumber = passportNumber || null;
    if (aadharNumber !== undefined) student.aadharNumber = aadharNumber;
    if (courseId !== undefined) {
      const course = await Course.findById(courseId);
      if (!course || !course.isActive) {
        return sendError(res, 'Invalid or inactive course', 400);
      }
      student.courseId = courseId;
    }
    if (universityId !== undefined) {
      const university = await University.findById(universityId);
      if (!university || !university.isActive) {
        return sendError(res, 'Invalid or inactive university', 400);
      }
      student.universityId = universityId;
    }
    if (documents !== undefined && Array.isArray(documents)) {
      const processedDocuments = documents.map(doc => {
        if (typeof doc === 'string') {
          return {
            fileId: uuidv4(),
            url: doc,
            fileType: doc.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
            originalName: doc.split('/').pop() || 'document'
          };
        } else if (doc.fileId && doc.path) {
          // If it's a file upload object with fileId and path
          return {
            fileId: doc.fileId,
            filename: doc.filename,
            originalName: doc.originalName,
            path: doc.path,
            fileType: doc.fileType,
            url: doc.url || `/api/files/${doc.fileId}`
          };
        } else if (doc.url) {
          return {
            fileId: uuidv4(),
            url: doc.url,
            fileType: doc.fileType || (doc.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
            originalName: doc.originalName || doc.url.split('/').pop() || 'document'
          };
        }
        return null;
      }).filter(Boolean);
      student.documents = processedDocuments;
    }

    await student.save();
    await student.populate('partnerId', 'companyName email');
    await student.populate('courseId', 'name description');
    await student.populate('universityId', 'name country');

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

    // Import S3 service and upload middleware helpers
    const { uploadToS3 } = require('../services/s3.service');
    const { getFileType } = require('../middlewares/upload.middleware');

    // Upload each file to S3 and create document metadata
    const documents = await Promise.all(
      req.files.map(async (file) => {
        // Determine file type
        const fileType = getFileType(file.mimetype);
        if (!fileType) {
          throw new Error(`Invalid file type: ${file.originalname}`);
        }

        // Validate file size (max 20MB)
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`File ${file.originalname} exceeds maximum size of 20MB`);
        }

        // Generate file ID
        const fileId = uuidv4();

        // Upload to S3
        const { s3Key, s3Url, fileName } = await uploadToS3(
          file.buffer,
          file.originalname,
          fileType,
          file.mimetype
        );

        // Return document metadata (stored in MongoDB, not the file)
        return {
          fileId,
          filename: fileName,
          originalName: file.originalname,
          s3Key,
          s3Url,
          fileType,
          url: s3Url, // For backward compatibility
        };
      })
    );

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
      metadata: { 
        fileCount: documents.length,
        fileIds: documents.map(doc => doc.fileId),
      },
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

