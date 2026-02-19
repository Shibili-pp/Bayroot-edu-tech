const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { PORT } = require('./src/config/env');
const { verifyEmailConfig } = require('./src/utils/email.util');
const { initializeSocket } = require('./src/services/socket.service');

// Connect to MongoDB
connectDB();

// Verify email configuration
verifyEmailConfig().then((isReady) => {
  if (!isReady) {
    console.warn('⚠️  Email configuration not ready. OTP emails may not work.');
    console.warn('⚠️  Please check EMAIL_USER and EMAIL_PASSWORD in .env file');
  }
});

// ARCHITECTURE IMPROVEMENT: Create HTTP server for Socket.IO integration
// Socket.IO requires an HTTP server instance, not just Express app
const server = http.createServer(app);

// Initialize Socket.IO server
// This enables real-time WebSocket communication for notifications
initializeSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO: WebSocket server initialized for real-time updates`);
});




