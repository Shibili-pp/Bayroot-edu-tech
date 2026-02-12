const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDirs = {
  images: 'uploads/images',
  videos: 'uploads/videos',
  pdfs: 'uploads/pdfs'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage with UUID naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = '';
    
    if (file.mimetype.startsWith('image/')) {
      uploadPath = uploadDirs.images;
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = uploadDirs.videos;
    } else if (file.mimetype === 'application/pdf') {
      uploadPath = uploadDirs.pdfs;
    } else {
      return cb(new Error('Invalid file type. Only jpg, png, pdf, and mp4 are allowed.'));
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use UUID for secure file naming
    const fileId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, fileId + ext);
  }
});

// File filter - only allow: jpg, png, pdf, mp4
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpg|jpeg|png|pdf|mp4)$/i;
  const extname = allowedExtensions.test(path.extname(file.originalname));
  
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'video/mp4'
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only jpg, png, pdf, and mp4 files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;

