require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/bayroot-edu-tech',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production-min-32-chars',
  EMAIL_CONFIG: {
    USER: process.env.EMAIL_USER || 'partnerbayroot@gmail.com',
    PASSWORD: process.env.EMAIL_PASSWORD || ''
  },
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
};

