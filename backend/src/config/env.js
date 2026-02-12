require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/bayroot-edu-tech',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production-min-32-chars'
};

