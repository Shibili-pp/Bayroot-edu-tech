const Student = require('../models/Student.model');
const Course = require('../models/Course.model');
const University = require('../models/University.model');
const StatusTimeline = require('../models/StatusTimeline.model');
const Admin = require('../models/Admin.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { formatStudentResponse } = require('../utils/studentResponse.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { decrypt } = require('../utils/encryption.util');
const { sendNewApplicationNotificationEmail } = require('../utils/email.util');
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

    const { fullName, email, phone, nationality, passportNumber, aadharNumber, courseId, universityId, intakeId, intakeYear, documents } = req.body;
    
    // Validate required fields (phone is optional in partner interface)
    if (!fullName || !email || !aadharNumber || !courseId || !universityId) {
      return sendError(res, 'Missing required fields: fullName, email, aadharNumber, courseId, universityId', 400);
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

    // Check for duplicate Aadhar Number
    const allStudents = await Student.find({ isDeleted: false }).select('aadharNumber passportNumber');
    const normalizedAadhar = aadharNumber.replace(/\s/g, '').toUpperCase();
    
    for (const existingStudent of allStudents) {
      const existingAadhar = decrypt(existingStudent.aadharNumber);
      if (existingAadhar && existingAadhar.replace(/\s/g, '').toUpperCase() === normalizedAadhar) {
        return sendError(res, 'DUPLICATE_AADHAR', 400);
      }
      
      // Check for duplicate Passport Number if provided
      if (passportNumber && existingStudent.passportNumber) {
        const existingPassport = decrypt(existingStudent.passportNumber);
        const normalizedPassport = passportNumber.trim().toUpperCase();
        if (existingPassport && existingPassport.trim().toUpperCase() === normalizedPassport) {
          return sendError(res, 'DUPLICATE_PASSPORT', 400);
        }
      }
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
      } else if (doc.fileId) {
        // If it has fileId but no path (new format)
        return {
          fileId: doc.fileId,
          filename: doc.filename,
          originalName: doc.originalName,
          s3Key: doc.s3Key,
          s3Url: doc.s3Url,
          fileType: doc.fileType,
          url: doc.url
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
      // If document doesn't have fileId, generate one
      return {
        fileId: uuidv4(),
        filename: doc.filename,
        originalName: doc.originalName || 'document',
        fileType: doc.fileType || 'file',
        url: doc.url || ''
      };
    }).filter(doc => doc && doc.fileId); // Ensure all documents have fileId
    
    const now = new Date();
    const student = new Student({
      fullName,
      email,
      phone: phone || '', // Phone is optional in partner interface
      nationality: nationality || null,
      passportNumber: passportNumber || null,
      aadharNumber,
      courseId,
      universityId,
      intakeId: intakeId || null,
      intakeYear: intakeYear || null,
      partnerId: userId,
      documents: processedDocuments,
      status: 'Under Review', // Explicitly set default status
      statusUpdatedAt: now // Explicitly set statusUpdatedAt when student is created
    });

    await student.save();
    await student.populate('partnerId', 'companyName email');
    await student.populate('courseId', 'name description');
    await student.populate('universityId', 'name country');
    await student.populate('intakeId', 'name');

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

    // Send email notification to all admins when partner submits new application
    try {
      const admins = await Admin.find({}).select('email');
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        await sendNewApplicationNotificationEmail(adminEmails, {
          studentName: student.fullName,
          partnerName: student.partnerId?.companyName || 'N/A',
          universityName: student.universityId?.name || 'N/A',
          courseName: student.courseId?.name || 'N/A'
        });
      }
    } catch (emailError) {
      console.error('Failed to send new application notification email:', emailError);
      // Don't fail student creation if email fails
    }

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
      .populate('intakeId', 'name')
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
      .populate('universityId', 'name country')
      .populate('intakeId', 'name');
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

    const { fullName, email, phone, nationality, passportNumber, aadharNumber, courseId, universityId, intakeId, intakeYear, documents, status } = req.body;
    
    // Update fields (encryption handled by model hooks)
    if (fullName !== undefined) student.fullName = fullName;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (passportNumber !== undefined) student.passportNumber = passportNumber || null;
    if (aadharNumber !== undefined) student.aadharNumber = aadharNumber;
    if (status !== undefined) {
      // Validate status
      const validStatuses = [
        'Under Review',
        'Offer Requested',
        'Offer Received',
        'Application payment 1 received',
        'Application Moved',
        'Ministry Submitted',
        'Exam issued',
        'Application payment 2 received',
        'Fee Paid',
        'Visa Documents Issued',
        'Visa Submitted',
        'Visa Received',
        'Full fee',
        'Application payment 3 received',
        'Visa rejected',
        'Trc request',
        'Trc approved',
        'Trc rejected',
        'Student Dropped'
      ];
      if (validStatuses.includes(status)) {
        // Check if status is actually changing
        if (student.status !== status) {
          // Admins can change status anytime - no restrictions
          // Only update statusUpdatedAt when status changes
          student.statusUpdatedAt = new Date();
        }
        student.status = status;
      } else {
        return sendError(res, 'Invalid status value', 400);
      }
    }
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
    if (intakeId !== undefined) {
      const Intake = require('../models/Intake.model');
      if (intakeId) {
        const intake = await Intake.findById(intakeId);
        if (!intake || !intake.isActive) {
          return sendError(res, 'Invalid or inactive intake', 400);
        }
        student.intakeId = intakeId;
      } else {
        student.intakeId = null;
      }
    }
    if (intakeYear !== undefined) {
      student.intakeYear = intakeYear || null;
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
    await student.populate('intakeId', 'name');

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

// Upload offer letter for student (Admin only)
const uploadOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    
    // Only Admin can upload offer letters
    if (role !== 'ADMIN') {
      return sendError(res, 'Only admins can upload offer letters', 403);
    }
    
    const student = await Student.findOne({ _id: id, isDeleted: false });
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Import S3 service and upload middleware helpers
    const { uploadToS3 } = require('../services/s3.service');
    const { getFileType } = require('../middlewares/upload.middleware');

    // Determine file type (only PDF or image allowed for offer letter)
    const fileType = getFileType(req.file.mimetype);
    if (!fileType || (fileType !== 'pdf' && fileType !== 'image')) {
      return sendError(res, 'Invalid file type. Only PDF and image files are allowed for offer letters', 400);
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return sendError(res, 'File exceeds maximum size of 20MB', 400);
    }

    // Generate file ID
    const fileId = uuidv4();

    // Upload to S3
    const { s3Key, s3Url, fileName } = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      fileType,
      req.file.mimetype
    );

    // Save offer letter metadata
    student.offerLetter = {
      fileId,
      filename: fileName,
      originalName: req.file.originalname,
      s3Key,
      s3Url,
      fileType,
      url: s3Url,
      uploadedAt: new Date(),
      uploadedBy: {
        userId,
        userModel: 'Admin'
      }
    };

    // Auto-update status: when admin uploads offer letter and status is "Offer Requested", change to "Offer Received"
    if (student.status === 'Offer Requested') {
      student.status = 'Offer Received';
      student.statusUpdatedAt = new Date();
    }

    await student.save();

    // Log audit
    await logAudit({
      userId,
      userModel: 'Admin',
      role,
      action: 'UPLOAD_OFFER_LETTER',
      targetId: student._id,
      targetModel: 'Student',
      metadata: { 
        fileId,
        fileName: req.file.originalname,
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    const formattedStudent = formatStudentResponse(student, role);
    return sendSuccess(res, { student: formattedStudent }, 'Offer letter uploaded successfully');
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

/**
 * Apply for Offer Letter - Admin only
 * When status is "Under Review": download Word with student info + change status to "Offer Requested"
 * When status is NOT "Under Review": download Excel with student info/documents (no status change)
 */
const applyOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate('universityId', 'name country')
      .populate('courseId', 'name')
      .populate('intakeId', 'name')
      .populate('partnerId', 'companyName email');

    if (!student || student.isDeleted) {
      return sendError(res, 'Student not found', 404);
    }

    const s = student.toObject();
    const data = {
      fullName: s.fullName,
      email: decrypt(s.email),
      phone: decrypt(s.phone),
      aadharNumber: decrypt(s.aadharNumber),
      passportNumber: s.passportNumber ? decrypt(s.passportNumber) : 'N/A',
      nationality: s.nationality || 'N/A',
      university: s.universityId?.name || 'N/A',
      country: s.universityId?.country || 'N/A',
      course: s.courseId?.name || 'N/A',
      intake: s.intakeId?.name || 'N/A',
      intakeYear: s.intakeYear || 'N/A',
      partnerCompany: s.partnerId?.companyName || 'N/A',
      partnerEmail: s.partnerId?.email || 'N/A',
      applicationId: s._id?.toString() || 'N/A',
      createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
    };

    if (student.status === 'Under Review') {
      // Generate Word document and update status to Offer Requested
      const { Document, Packer, Paragraph, TextRun } = require('docx');

      const label = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Student Application - Offer Letter Request', bold: true })] }),
            new Paragraph({ text: '' }),
            ...Object.entries(data).map(([key, val]) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${label(key)}: `, bold: true }),
                  new TextRun({ text: String(val ?? 'N/A') })
                ]
              })
            )
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      student.status = 'Offer Requested';
      student.statusUpdatedAt = new Date();
      await student.save();

      const fileName = `OfferLetterRequest_${(data.fullName || 'Student').replace(/\s+/g, '_')}_${Date.now()}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(buffer);
    } else {
      // Generate Excel with student info and documents
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Student Info');

      ws.columns = [
        { header: 'Field', width: 25 },
        { header: 'Value', width: 40 }
      ];
      ws.addRow(['Field', 'Value']);
      ws.getRow(1).font = { bold: true };

      Object.entries(data).forEach(([key, val]) => {
        ws.addRow([key.replace(/([A-Z])/g, ' $1').trim(), val || 'N/A']);
      });

      if (s.documents && s.documents.length > 0) {
        ws.addRow([]);
        ws.addRow(['Documents', '']);
        ws.addRow(['Document Name', 'Type', 'Uploaded']);
        s.documents.forEach(doc => {
          ws.addRow([
            doc.originalName || doc.filename || 'Document',
            doc.fileType || 'N/A',
            doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'
          ]);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `StudentExport_${(data.fullName || 'Student').replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Apply offer letter error:', error);
    return sendError(res, error.message || 'Failed to apply for offer letter', 500);
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  uploadDocuments,
  uploadOfferLetter,
  deleteStudent,
  applyOfferLetter
};

