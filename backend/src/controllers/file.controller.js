const Student = require('../models/Student.model');
const fs = require('fs');
const path = require('path');
const { sendSuccess, sendError } = require('../utils/response.util');
const { logAudit, getClientIp } = require('../utils/audit.util');

/**
 * Secure file download
 * GET /api/files/:fileId
 */
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Find student that owns this file (exclude deleted)
    const student = await Student.findOne({
      'documents.fileId': fileId,
      isDeleted: false
    });

    if (!student) {
      return sendError(res, 'File not found', 404);
    }

    // Check access permissions
    if (role === 'PARTNER' && student.partnerId.toString() !== userId) {
      return sendError(res, 'Access denied. You can only access files for your own students.', 403);
    }

    // Find the document
    const document = student.documents.find(doc => doc.fileId === fileId);
    if (!document) {
      return sendError(res, 'File not found', 404);
    }

    // Check if file exists
    const filePath = path.join(__dirname, '../../', document.path);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'File not found on server', 404);
    }

    // Prepare watermark metadata (for future PDF/image processing)
    const watermarkMetadata = {
      downloadedVia: 'Bayroot Edu Tech',
      partnerId: role === 'PARTNER' ? userId : student.partnerId.toString(),
      timestamp: new Date().toISOString(),
      fileId: fileId
    };

    // Log audit with watermark metadata
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'DOWNLOAD_FILE',
      targetId: student._id,
      targetModel: 'Student',
      metadata: { 
        fileId, 
        filename: document.originalName,
        watermark: watermarkMetadata,
        dailyCount: req.downloadInfo?.dailyCount,
        limit: req.downloadInfo?.limit
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    // Stream file securely
    // NOTE: Actual watermark embedding (PDF/image processing) can be added here in future
    // For now, metadata is logged for tracking purposes
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', getContentType(document.fileType));
    
    // Add custom header with watermark metadata (for tracking)
    res.setHeader('X-Download-Metadata', JSON.stringify(watermarkMetadata));

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Upload file (for use before student creation)
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
    let fileType = 'pdf';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    }

    // Generate file ID
    const { v4: uuidv4 } = require('uuid');
    const fileId = uuidv4();

    // Create file metadata
    const fileMetadata = {
      fileId: fileId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      fileType: fileType,
      url: `/api/files/${fileId}`, // URL to access the file
      uploadedAt: new Date()
    };

    // Log audit
    await logAudit({
      userId,
      userModel: role === 'ADMIN' ? 'Admin' : 'Partner',
      role,
      action: 'UPLOAD_FILE',
      metadata: { 
        fileId, 
        filename: req.file.originalname,
        fileType: fileType
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { file: fileMetadata }, 'File uploaded successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get content type based on file type
 */
const getContentType = (fileType) => {
  const contentTypes = {
    image: 'image/jpeg',
    video: 'video/mp4',
    pdf: 'application/pdf'
  };
  return contentTypes[fileType] || 'application/octet-stream';
};

module.exports = {
  downloadFile,
  uploadFile
};
