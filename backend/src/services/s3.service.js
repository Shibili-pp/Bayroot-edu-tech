const { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, s3Config, getS3Folder, getS3Url } = require('../config/s3.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Build a safe ASCII-only file extension for the S3 object key.
 * Do NOT use path.extname(originalName): names with multiple dots / mixed scripts
 * (e.g. Georgian "ია.გ..pdf") can yield a non-ASCII "extension", which ends up in
 * the S3 Key and breaks AWS Signature V4 signing ("signature does not match").
 * The human-readable name (any language) stays in MongoDB as originalName.
 */
const resolveAsciiStorageExtension = (originalName, mimeType, fileType) => {
  const name = String(originalName || '');
  const asciiExt = name.match(/(\.[A-Za-z0-9]{1,12})$/);
  if (asciiExt) {
    return asciiExt[1].toLowerCase();
  }
  const mimeMap = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  };
  const m = (mimeType && String(mimeType).toLowerCase()) || '';
  if (mimeMap[m]) return mimeMap[m];
  const typeMap = { image: '.jpg', video: '.mp4', pdf: '.pdf' };
  if (fileType && typeMap[fileType]) return typeMap[fileType];
  return '.bin';
};

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
    // Generate unique filename (ASCII key only — see resolveAsciiStorageExtension)
    const fileId = uuidv4();
    const ext = resolveAsciiStorageExtension(originalName, mimeType, fileType);
    const fileName = `${fileId}${ext}`;
    
    // Get S3 folder path
    const folder = getS3Folder(fileType);
    const s3Key = `${folder}${fileName}`;

    // Do NOT attach user-defined Metadata (x-amz-meta-*) to PutObject.
    // Any non-ASCII in metadata values — and base64's "+" / "/" in values — can break
    // AWS Signature V4 signing. Original display names are stored in MongoDB only
    // (student.documents.originalName, comments, etc.).

    // MIME must be ASCII-only for signing; strip parameters (e.g. charset) some clients send
    const rawMime = String(mimeType || 'application/octet-stream').split(';')[0].trim();
    const contentType = /^(application|image|video|audio|text)\/[a-z0-9.+-]+$/i.test(rawMime)
      ? rawMime
      : 'application/octet-stream';

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
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

/**
 * Generate presigned URL for secure file access
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
const getPresignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Get file from S3 as a stream
 * @param {string} s3Key - S3 object key
 * @returns {Promise<{Body: ReadableStream, ContentType: string, ContentLength: number}>}
 */
const getFileFromS3 = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    return {
      Body: response.Body,
      ContentType: response.ContentType || 'application/octet-stream',
      ContentLength: response.ContentLength || 0,
      Metadata: response.Metadata || {},
    };
  } catch (error) {
    throw new Error(`Failed to get file from S3: ${error.message}`);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  fileExistsInS3,
  getPresignedUrl,
  getFileFromS3,
};




