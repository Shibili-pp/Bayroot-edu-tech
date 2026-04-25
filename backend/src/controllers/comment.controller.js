const mongoose = require('mongoose');
const Comment = require('../models/Comment.model');
const Student = require('../models/Student.model');
const Admin = require('../models/Admin.model');
const Partner = require('../models/Partner.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { sendCommentNotificationEmail } = require('../utils/email.util');
const { emitUnreadCount } = require('../services/socket.service');
const { v4: uuidv4 } = require('uuid');
const { MAX_FILE_SIZE_BYTES } = require('../middlewares/upload.middleware');

// Get all unread admin comments for partner (bulk endpoint)
const getUnreadAdminComments = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const limit = parseInt(req.query.limit) || 10;

    // Only partners can use this endpoint
    if (role !== 'PARTNER') {
      return sendError(res, 'This endpoint is only available for partners', 403);
    }

    // Get all students for this partner
    const students = await Student.find({ 
      partnerId: userId, 
      isDeleted: false 
    }).select('_id fullName');

    if (students.length === 0) {
      return sendSuccess(res, { comments: [] }, 'No unread comments found');
    }

    const studentIds = students.map(s => s._id);

    // Get all unread comments from admin for these students
    const unreadComments = await Comment.find({
      studentId: { $in: studentIds },
      role: 'ADMIN',
      isRead: false
    })
      .populate('authorId', 'name email')
      .populate('studentId', 'fullName')
      .sort({ createdAt: -1 }) // Latest first
      .limit(limit);

    // Format response with student info
    const formattedComments = unreadComments.map(comment => {
      const student = students.find(s => s._id.toString() === comment.studentId._id.toString());
      return {
        id: comment._id,
        commentId: comment._id,
        studentId: comment.studentId._id,
        studentName: student?.fullName || comment.studentId.fullName || 'Unknown',
        message: comment.message,
        messagePreview: comment.message.length > 80 
          ? comment.message.substring(0, 80) + '...' 
          : comment.message,
        createdAt: comment.createdAt,
        authorName: comment.authorId?.name || 'Admin',
        hasDocuments: comment.documents && comment.documents.length > 0,
        isReply: !!comment.parentCommentId
      };
    });

    return sendSuccess(res, { comments: formattedComments }, 'Unread comments retrieved successfully');
  } catch (error) {
    console.error('Error fetching unread admin comments:', error);
    return sendError(res, error.message, 500);
  }
};

// Get all unread partner comments for admin (bulk endpoint)
const getUnreadPartnerComments = async (req, res) => {
  try {
    const role = req.user.role;
    const limit = parseInt(req.query.limit) || 10;

    // Only admins can use this endpoint
    if (role !== 'ADMIN') {
      return sendError(res, 'This endpoint is only available for admins', 403);
    }

    // Get all unread comments from partners (for all students)
    const unreadComments = await Comment.find({
      role: 'PARTNER',
      isRead: false
    })
      .populate('authorId', 'companyName email')
      .populate('studentId', 'fullName partnerId')
      .populate('studentId.partnerId', 'companyName')
      .sort({ createdAt: -1 }) // Latest first
      .limit(limit);

    // Format response with student and partner info
    const formattedComments = unreadComments.map(comment => {
      const student = comment.studentId;
      const partner = student?.partnerId;
      
      return {
        id: comment._id,
        commentId: comment._id,
        studentId: student?._id || student?.id,
        studentName: student?.fullName || 'Unknown',
        partnerName: partner?.companyName || comment.authorId?.companyName || 'Partner',
        message: comment.message,
        messagePreview: comment.message.length > 80 
          ? comment.message.substring(0, 80) + '...' 
          : comment.message,
        createdAt: comment.createdAt,
        authorName: comment.authorId?.companyName || 'Partner',
        hasDocuments: comment.documents && comment.documents.length > 0,
        isReply: !!comment.parentCommentId
      };
    });

    return sendSuccess(res, { comments: formattedComments }, 'Unread comments retrieved successfully');
  } catch (error) {
    console.error('Error fetching unread partner comments:', error);
    return sendError(res, error.message, 500);
  }
};

// Get all comments for a student
const getComments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Verify student exists and user has access
    const query = { _id: studentId, isDeleted: false };
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Get all comments (parent comments and replies)
    const comments = await Comment.find({ studentId })
      .populate('authorId', role === 'ADMIN' ? 'name email' : 'companyName email')
      .populate('parentCommentId')
      .sort({ createdAt: 1 });

    // Mark comments as read for the current user
    await Comment.updateMany(
      {
        studentId,
        authorId: { $ne: userId },
        role: { $ne: role },
        isRead: false
      },
      { isRead: true }
    );

    // ARCHITECTURE IMPROVEMENT: Emit real-time unread count update after marking as read
    // This ensures notification badge updates immediately without polling
    // OPTIMIZATION: Calculate count once, emit to relevant users
    try {
      if (role === 'PARTNER') {
        // Partner marked comments as read → update all admins' unread count
        const unreadCount = await Comment.countDocuments({
          role: 'PARTNER',
          isRead: false
        });
        const admins = await Admin.find({}).select('_id');
        for (const admin of admins) {
          emitUnreadCount(admin._id.toString(), unreadCount, 'ADMIN');
        }
      } else if (role === 'ADMIN') {
        // Admin marked comments as read → update partner's unread count
        const student = await Student.findById(studentId).select('partnerId');
        if (student && student.partnerId) {
          const partnerId = student.partnerId.toString();
          const partnerStudents = await Student.find({ 
            partnerId: partnerId, 
            isDeleted: false 
          }).select('_id');
          const studentIds = partnerStudents.map(s => s._id);
          
          const unreadCount = await Comment.countDocuments({
            studentId: { $in: studentIds },
            role: 'ADMIN',
            isRead: false
          });
          emitUnreadCount(partnerId, unreadCount, 'PARTNER');
        }
      }
    } catch (socketError) {
      // Don't fail request if socket emit fails
      console.error('Error emitting unread count via Socket.IO:', socketError);
    }

    return sendSuccess(res, { comments }, 'Comments retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const { parentCommentId } = req.body;
    const rawMessage =
      req.body && req.body.message != null ? String(req.body.message) : '';
    const hasFiles = req.files && req.files.length > 0;

    if (!rawMessage.trim() && !hasFiles) {
      return sendError(res, 'Please enter a message or attach a file', 400);
    }

    const messageForDb = rawMessage.trim() || (hasFiles ? '[Attachment]' : '');

    // Verify student exists and user has access
    const query = { _id: studentId, isDeleted: false };
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // If replying, verify parent comment exists
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return sendError(res, 'Invalid parent comment', 400);
      }
      const parentComment = await Comment.findOne({ _id: parentCommentId, studentId });
      if (!parentComment) {
        return sendError(res, 'Parent comment not found', 404);
      }
    }

    // Handle document uploads if any
    let documents = [];
    if (req.files && req.files.length > 0) {
      const { uploadToS3 } = require('../services/s3.service');
      const { getFileType } = require('../middlewares/upload.middleware');

      documents = await Promise.all(
        req.files.map(async (file) => {
          const fileType = getFileType(file.mimetype);
          if (!fileType) {
            throw new Error(`Invalid file type: ${file.originalname}`);
          }

          if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`File ${file.originalname} exceeds maximum size of 150MB`);
          }

          const fileId = uuidv4();
          const { s3Key, s3Url, fileName } = await uploadToS3(
            file.buffer,
            file.originalname,
            fileType,
            file.mimetype
          );

          return {
            fileId,
            filename: fileName,
            originalName: file.originalname,
            s3Key,
            s3Url,
            fileType,
            url: s3Url
          };
        })
      );
    }

    const comment = new Comment({
      studentId,
      authorId: userId,
      authorModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      message: messageForDb,
      documents,
      parentCommentId: parentCommentId || null,
      isRead: false
    });

    await comment.save();

    // Populate author info
    await comment.populate('authorId', role === 'ADMIN' ? 'name email' : 'companyName email');

    // Get student info with partner populated for email notification
    const studentWithPartner = await Student.findById(studentId)
      .populate('partnerId', 'companyName email')
      .select('fullName partnerId');

    // Send email notification
    try {
      if (role === 'PARTNER') {
        // Partner sent comment → notify admin
        // Get all admin emails
        const admins = await Admin.find({}).select('email name');
        const commenterName = comment.authorId?.companyName || 'Partner';
        
        // Send email to each admin
        for (const admin of admins) {
          await sendCommentNotificationEmail(admin.email, {
            studentName: studentWithPartner.fullName,
            commenterName: commenterName,
            commenterRole: 'PARTNER',
            message: messageForDb,
            isReply: !!parentCommentId
          });
        }
      } else if (role === 'ADMIN') {
        // Admin sent comment → notify partner (who created the student)
        if (studentWithPartner.partnerId && studentWithPartner.partnerId.email) {
          const commenterName = comment.authorId?.name || 'Bayroot Admin';
          
          await sendCommentNotificationEmail(studentWithPartner.partnerId.email, {
            studentName: studentWithPartner.fullName,
            commenterName: commenterName,
            commenterRole: 'ADMIN',
            message: messageForDb,
            isReply: !!parentCommentId
          });
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the comment creation
      console.error('Failed to send comment notification email:', emailError);
    }

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'CREATE_COMMENT',
      targetId: studentId,
      targetModel: 'Student',
      metadata: {
        commentId: comment._id,
        hasDocuments: documents.length > 0,
        isReply: !!parentCommentId
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    // ARCHITECTURE IMPROVEMENT: Emit real-time unread count update via WebSocket
    // This replaces polling-based notification system
    // OPTIMIZATION: Calculate count once and emit to all relevant users
    try {
      if (role === 'PARTNER') {
        // Partner sent comment → notify all admins of new unread count
        // OPTIMIZATION: Calculate count once, emit to all admins
        const unreadCount = await Comment.countDocuments({
          role: 'PARTNER',
          isRead: false
        });
        const admins = await Admin.find({}).select('_id');
        for (const admin of admins) {
          emitUnreadCount(admin._id.toString(), unreadCount, 'ADMIN');
        }
      } else if (role === 'ADMIN') {
        // Admin sent comment → notify partner of new unread count
        if (studentWithPartner.partnerId) {
          const partnerId = studentWithPartner.partnerId._id.toString();
          // Get all students for this partner
          const partnerStudents = await Student.find({ 
            partnerId: partnerId, 
            isDeleted: false 
          }).select('_id');
          const studentIds = partnerStudents.map(s => s._id);
          
          // Calculate unread admin comments for this partner
          const unreadCount = await Comment.countDocuments({
            studentId: { $in: studentIds },
            role: 'ADMIN',
            isRead: false
          });
          emitUnreadCount(partnerId, unreadCount, 'PARTNER');
        }
      }
    } catch (socketError) {
      // Don't fail comment creation if socket emit fails
      console.error('Error emitting unread count via Socket.IO:', socketError);
    }

    return sendSuccess(res, { comment }, 'Comment created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Update comment (mark as read, edit message)
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const { message, isRead } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return sendError(res, 'Comment not found', 404);
    }

    // Verify user has access to the student
    const query = { _id: comment.studentId, isDeleted: false };
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Only author can edit message
    if (message !== undefined) {
      if (comment.authorId.toString() !== userId.toString()) {
        return sendError(res, 'You can only edit your own comments', 403);
      }
      comment.message = message.trim();
      comment.updatedAt = new Date();
    }

    // Anyone can mark as read
    if (isRead !== undefined) {
      comment.isRead = isRead;
    }

    await comment.save();
    await comment.populate('authorId', role === 'ADMIN' ? 'name email' : 'companyName email');

    // ARCHITECTURE IMPROVEMENT: Emit real-time unread count update when comment is marked as read
    // OPTIMIZATION: Calculate count once, emit to relevant users
    try {
      const student = await Student.findById(comment.studentId).select('partnerId');
      
      if (comment.role === 'PARTNER') {
        // Partner comment marked as read → update all admins' unread count
        const unreadCount = await Comment.countDocuments({
          role: 'PARTNER',
          isRead: false
        });
        const admins = await Admin.find({}).select('_id');
        for (const admin of admins) {
          emitUnreadCount(admin._id.toString(), unreadCount, 'ADMIN');
        }
      } else if (comment.role === 'ADMIN' && student && student.partnerId) {
        // Admin comment marked as read → update partner's unread count
        const partnerId = student.partnerId.toString();
        const partnerStudents = await Student.find({ 
          partnerId: partnerId, 
          isDeleted: false 
        }).select('_id');
        const studentIds = partnerStudents.map(s => s._id);
        
        const unreadCount = await Comment.countDocuments({
          studentId: { $in: studentIds },
          role: 'ADMIN',
          isRead: false
        });
        emitUnreadCount(partnerId, unreadCount, 'PARTNER');
      }
    } catch (socketError) {
      // Don't fail request if socket emit fails
      console.error('Error emitting unread count via Socket.IO:', socketError);
    }

    return sendSuccess(res, { comment }, 'Comment updated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return sendError(res, 'Comment not found', 404);
    }

    // Verify user has access to the student
    const query = { _id: comment.studentId, isDeleted: false };
    if (role === 'PARTNER') {
      query.partnerId = userId;
    }

    const student = await Student.findOne(query);
    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Only author or admin can delete
    if (comment.authorId.toString() !== userId.toString() && role !== 'ADMIN') {
      return sendError(res, 'You can only delete your own comments', 403);
    }

    // Delete replies first
    await Comment.deleteMany({ parentCommentId: commentId });

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'DELETE_COMMENT',
      targetId: comment.studentId,
      targetModel: 'Student',
      metadata: { commentId },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, null, 'Comment deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getComments,
  getUnreadAdminComments,
  getUnreadPartnerComments,
  createComment,
  updateComment,
  deleteComment
};





