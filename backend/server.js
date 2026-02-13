const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');
const { verifyEmailConfig } = require('./src/utils/email.util');

// Connect to MongoDB
connectDB();

// Verify email configuration
verifyEmailConfig().then((isReady) => {
  if (!isReady) {
    console.warn('⚠️  Email configuration not ready. OTP emails may not work.');
    console.warn('⚠️  Please check EMAIL_USER and EMAIL_PASSWORD in .env file');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});




