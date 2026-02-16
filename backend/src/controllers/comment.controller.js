const Comment = require('../models/Comment.model');
const Student = require('../models/Student.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { v4: uuidv4 } = require('uuid');

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
    const { message, parentCommentId } = req.body;

    if (!message || !message.trim()) {
      return sendError(res, 'Message is required', 400);
    }

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

          const maxSize = 20 * 1024 * 1024;
          if (file.size > maxSize) {
            throw new Error(`File ${file.originalname} exceeds maximum size of 20MB`);
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
      message: message.trim(),
      documents,
      parentCommentId: parentCommentId || null,
      isRead: false
    });

    await comment.save();

    // Populate author info
    await comment.populate('authorId', role === 'ADMIN' ? 'name email' : 'companyName email');

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
  createComment,
  updateComment,
  deleteComment
};

