const multer = require('multer');
const path = require('path');
const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

/**
 * File type validation
 * Supported: Images (jpg, png, jpeg, webp), Videos (mp4), PDFs
 */
const allowedMimeTypes = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  videos: ['video/mp4', 'video/quicktime', 'video/webm'],
  pdfs: ['application/pdf'],
};

const allowedExtensions = {
  images: /\.(jpg|jpeg|png|webp)$/i,
  videos: /\.(mp4|mov|webm)$/i,
  pdfs: /\.(pdf)$/i,
};

/**
 * File filter - validates file type
 */
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  // Check if file type is allowed
  const isValidImage = 
    allowedMimeTypes.images.includes(mimetype) && 
    allowedExtensions.images.test(extname);
  
  const isValidVideo = 
    allowedMimeTypes.videos.includes(mimetype) && 
    allowedExtensions.videos.test(extname);
  
  const isValidPdf = 
    allowedMimeTypes.pdfs.includes(mimetype) && 
    allowedExtensions.pdfs.test(extname);

  if (isValidImage || isValidVideo || isValidPdf) {
    return cb(null, true);
  } else {
    cb(new Error(
      'Invalid file type. Only images (jpg, png, jpeg, webp), videos (mp4, mov, webm), and PDFs are allowed.'
    ));
  }
};

/**
 * Multer configuration with memoryStorage
 * Files are stored in memory before uploading to S3
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: fileFilter,
});

/**
 * Helper function to determine file type from mimetype
 * @param {string} mimetype - File MIME type
 * @returns {string} 'image', 'video', or 'pdf'
 */
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype === 'application/pdf') {
    return 'pdf';
  }
  return null;
};

module.exports = {
  upload,
  getFileType,
  allowedMimeTypes,
  MAX_FILE_SIZE_BYTES,
};
