const config = require('./env');

const { S3Client } = require('@aws-sdk/client-s3');

/**
 * PutObject integrity: SDK 3.729+ may attach x-amz-checksum-* headers. In several
 * deployments that breaks SigV4 ("signature does not match"). Default to DISABLED.
 * Opt in: AWS_S3_REQUEST_CHECKSUM_MODE=WHEN_REQUIRED
 */
const requestChecksumCalculation = process.env.AWS_S3_REQUEST_CHECKSUM_MODE ?? 'DISABLED';
const responseChecksumValidation =
  process.env.AWS_S3_RESPONSE_CHECKSUM_VALIDATION ?? 'DISABLED';

/**
 * AWS S3 Client Configuration
 * Uses environment variables for credentials
 */
const s3Client = new S3Client({
  region: config.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation,
  responseChecksumValidation,
});

/**
 * S3 Bucket Configuration
 */
const s3Config = {
  bucketName: config.AWS_S3_BUCKET_NAME,
  region: config.AWS_REGION || 'us-east-1',
  // Folder structure in S3
  folders: {
    images: 'uploads/images/',
    videos: 'uploads/videos/',
    pdfs: 'uploads/pdfs/',
  },
};

/**
 * Get S3 folder path based on file type
 * @param {string} fileType - 'image', 'video', or 'pdf'
 * @returns {string} S3 folder path
 */
const getS3Folder = (fileType) => {
  const folderMap = {
    image: s3Config.folders.images,
    video: s3Config.folders.videos,
    pdf: s3Config.folders.pdfs,
  };
  return folderMap[fileType] || s3Config.folders.pdfs;
};

/**
 * Generate S3 file URL
 * @param {string} key - S3 object key (path + filename)
 * @returns {string} Full S3 URL
 */
const getS3Url = (key) => {
  const region = s3Config.region;
  const bucket = s3Config.bucketName;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

module.exports = {
  s3Client,
  s3Config,
  getS3Folder,
  getS3Url,
};






