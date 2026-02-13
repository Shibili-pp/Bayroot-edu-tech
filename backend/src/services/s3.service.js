const { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, s3Config, getS3Folder, getS3Url } = require('../config/s3.config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} fileType - 'image', 'video', or 'pdf'
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{s3Key: string, s3Url: string, fileName: string}>}
 */
const uploadToS3 = async (fileBuffer, originalName, fileType, mimeType) => {
  try {
    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(originalName).toLowerCase();
    const fileName = `${fileId}${ext}`;
    
    // Get S3 folder path
    const folder = getS3Folder(fileType);
    const s3Key = `${folder}${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Add metadata
      Metadata: {
        originalName: originalName,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Generate S3 URL
    const s3Url = getS3Url(s3Key);

    return {
      s3Key,
      s3Url,
      fileName,
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (s3Key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error) {
    throw new Error(`S3 delete failed: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<boolean>}
 */
const fileExistsInS3 = async (s3Key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  fileExistsInS3,
};

