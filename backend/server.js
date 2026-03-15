const http = require('http');
const { exec } = require('child_process');
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

// -----------------------------
// GitHub Webhook Deploy Route
// -----------------------------
app.post('/deploy', (req, res) => {
  console.log('🚀 GitHub webhook triggered: Deploying new code...');

  exec(
    'cd /home/ubuntu/Bayroot-edu-tech/backend && git pull origin main && npm install && pm2 restart bayroot-backend',
    (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Deployment error:', error);
        return res.status(500).send('Deployment failed');
      }

      console.log(stdout);
      console.log('✅ Deployment successful');

      res.status(200).send('Deployment successful');
    }
  );
});

// ARCHITECTURE IMPROVEMENT: Create HTTP server for Socket.IO integration
const server = http.createServer(app);

// Initialize Socket.IO server
initializeSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO: WebSocket server initialized for real-time updates`);
});