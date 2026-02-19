/**
 * Socket.IO Service
 * 
 * ARCHITECTURE IMPROVEMENT: WebSocket-based real-time updates
 * Replaces polling-based notification system with efficient WebSocket events
 * 
 * Features:
 * - User-specific rooms (userId-based) for targeted event delivery
 * - No global broadcasts - events only sent to relevant users
 * - Maintains backward compatibility with existing REST API
 */

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
const initializeSocket = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../config/env');
  const { isTokenBlacklisted } = require('../middlewares/tokenBlacklist.middleware');

  const { FRONTEND_URL } = require('../config/env');
  
  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'] // Support both transports for compatibility
  });

  // Authentication middleware for Socket.IO connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Check if token is blacklisted
      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        return next(new Error('Authentication error: Token revoked'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to socket
      socket.userId = decoded.userId || decoded.id;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log(`Socket.IO: User ${userId} (${userRole}) connected`);

    // Join user-specific room for targeted event delivery
    // Room format: "user:{userId}" ensures events only go to this specific user
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // Also join role-based room for potential role-specific broadcasts (future use)
    const roleRoom = `role:${userRole}`;
    socket.join(roleRoom);

    socket.on('disconnect', () => {
      console.log(`Socket.IO: User ${userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket.IO error for user ${userId}:`, error);
    });
  });

  console.log('Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
const getIO = () => {
  return io;
};

/**
 * Emit unread count update to specific user
 * ARCHITECTURE: Uses user-specific room for targeted delivery
 * 
 * @param {string} userId - Target user ID
 * @param {number} count - New unread count
 * @param {string} userRole - User role (ADMIN or PARTNER)
 */
const emitUnreadCount = async (userId, count, userRole) => {
  if (!io) {
    console.warn('Socket.IO not initialized, skipping unread count emit');
    return;
  }

  try {
    const userRoom = `user:${userId}`;
    
    // Emit only to the specific user's room (no global broadcast)
    io.to(userRoom).emit('newUnreadCount', {
      count,
      timestamp: new Date().toISOString()
    });

    console.log(`Socket.IO: Emitted unread count ${count} to user ${userId} (${userRole})`);
  } catch (error) {
    console.error('Error emitting unread count:', error);
  }
};

/**
 * Emit approval status change to partner
 * ARCHITECTURE: Uses user-specific room for targeted delivery
 * 
 * @param {string} partnerId - Partner user ID
 * @param {boolean} isApproved - New approval status
 */
const emitApprovalStatusChange = (partnerId, isApproved) => {
  if (!io) {
    console.warn('Socket.IO not initialized, skipping approval status emit');
    return;
  }

  try {
    const userRoom = `user:${partnerId}`;
    
    // Emit only to the specific partner's room
    io.to(userRoom).emit('approvalStatusChanged', {
      isApproved,
      timestamp: new Date().toISOString()
    });

    console.log(`Socket.IO: Emitted approval status ${isApproved} to partner ${partnerId}`);
  } catch (error) {
    console.error('Error emitting approval status:', error);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitUnreadCount,
  emitApprovalStatusChange
};

