const File = require('../models/File.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');
const { uploadToS3, deleteFromS3, fileExistsInS3 } = require('../services/s3.service');
const { getFileType } = require('../middlewares/upload.middleware');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload file to S3 and save metadata to MongoDB
 * POST /api/files/upload
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Determine file type
    const fileType = getFileType(req.file.mimetype);
    if (!fileType) {
      return sendError(res, 'Invalid file type', 400);
    }

    // Validate file size (already validated by multer, but double-check)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (req.file.size > maxSize) {
      return sendError(res, 'File size exceeds maximum limit of 20MB', 400);
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

    // Save file metadata to MongoDB
    const fileDocument = new File({
      fileId,
      originalName: req.file.originalname,
      fileName,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Key,
      s3Url,
      uploadedBy: {
        userId,
        role,
      },
      metadata: {
        uploadedAt: new Date().toISOString(),
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent'),
      },
    });

    await fileDocument.save();

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'UPLOAD_FILE',
      targetId: fileDocument._id,
      targetModel: 'File',
      metadata: {
        fileId,
        fileName,
        fileType,
        s3Key,
        originalName: req.file.originalname,
        fileSize: req.file.size,
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent'),
    });

    return sendSuccess(
      res,
      {
        file: {
          fileId: fileDocument.fileId,
          originalName: fileDocument.originalName,
          fileName: fileDocument.fileName,
          fileType: fileDocument.fileType,
          fileSize: fileDocument.fileSize,
          s3Url: fileDocument.s3Url,
          uploadedAt: fileDocument.createdAt,
        },
      },
      'File uploaded successfully'
    );
  } catch (error) {
    console.error('File upload error:', error);
    return sendError(res, error.message || 'File upload failed', 500);
  }
};

/**
 * Get file metadata by fileId
 * GET /api/files/:fileId
 */
const getFileMetadata = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Find file in MongoDB
    const file = await File.findByFileId(fileId);
    if (!file) {
      return sendError(res, 'File not found', 404);
    }

    // Check access permissions
    if (role === 'PARTNER' && file.uploadedBy.userId.toString() !== userId) {
      return sendError(res, 'Access denied. You can only access files you uploaded.', 403);
    }

    // Verify file still exists in S3
    const existsInS3 = await fileExistsInS3(file.s3Key);
    if (!existsInS3) {
      return sendError(res, 'File not found in storage', 404);
    }

    return sendSuccess(res, {
      file: {
        fileId: file.fileId,
        originalName: file.originalName,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        s3Url: file.s3Url,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
      },
    });
  } catch (error) {
    console.error('Get file metadata error:', error);
    return sendError(res, error.message || 'Failed to retrieve file', 500);
  }
};

/**
 * Delete file from S3 and MongoDB
 * DELETE /api/files/:fileId
 */
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Find file in MongoDB
    const file = await File.findByFileId(fileId);
    if (!file) {
      return sendError(res, 'File not found', 404);
    }

    // Check access permissions
    if (role === 'PARTNER' && file.uploadedBy.userId.toString() !== userId) {
      return sendError(res, 'Access denied. You can only delete files you uploaded.', 403);
    }

    // Delete from S3
    try {
      await deleteFromS3(file.s3Key);
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error);
      // Continue with MongoDB deletion even if S3 delete fails
    }

    // Delete from MongoDB
    await File.findByIdAndDelete(file._id);

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'DELETE_FILE',
      targetId: file._id,
      targetModel: 'File',
      metadata: {
        fileId,
        fileName: file.fileName,
        s3Key: file.s3Key,
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent'),
    });

    return sendSuccess(res, null, 'File deleted successfully');
  } catch (error) {
    console.error('Delete file error:', error);
    return sendError(res, error.message || 'Failed to delete file', 500);
  }
};

/**
 * List files uploaded by user
 * GET /api/files
 */
const listFiles = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;
    const { fileType, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (role === 'PARTNER') {
      query['uploadedBy.userId'] = userId;
    }
    if (fileType && ['image', 'video', 'pdf'].includes(fileType)) {
      query.fileType = fileType;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('fileId originalName fileName fileType fileSize s3Url uploadedBy createdAt')
      .lean();

    const total = await File.countDocuments(query);

    return sendSuccess(res, {
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    return sendError(res, error.message || 'Failed to list files', 500);
  }
};

module.exports = {
  uploadFile,
  getFileMetadata,
  deleteFile,
  listFiles,
};
