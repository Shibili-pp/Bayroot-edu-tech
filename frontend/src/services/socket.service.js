/**
 * Socket.IO Service for Frontend
 * 
 * ARCHITECTURE IMPROVEMENT: WebSocket-based real-time updates
 * Replaces polling-based notification system with efficient WebSocket events
 * 
 * Features:
 * - Automatic reconnection on disconnect
 * - JWT token authentication
 * - Event listeners for real-time updates
 * - Cleanup on component unmount
 */

import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

/**
 * Initialize Socket.IO connection
 * ARCHITECTURE: Connects with JWT token for authentication
 * 
 * @param {string} token - JWT authentication token
 * @returns {Socket} Socket.IO instance
 */
export const initializeSocket = (token) => {
  // Close existing connection if any
  if (socket && socket.connected) {
    socket.disconnect();
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const socketUrl = apiBaseUrl.replace('/api', ''); // Remove /api suffix for socket connection

  socket = io(socketUrl, {
    auth: {
      token: token // Send JWT token for authentication
    },
    transports: ['websocket', 'polling'], // Support both transports
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: maxReconnectAttempts
  });

  socket.on('connect', () => {
    console.log('Socket.IO: Connected to server');
    reconnectAttempts = 0; // Reset on successful connection
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO: Disconnected from server:', reason);
    
    // If disconnected due to server error, attempt reconnection
    if (reason === 'io server disconnect') {
      // Server disconnected, reconnect manually
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    console.error('Socket.IO: Connection error:', error.message);
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Socket.IO: Max reconnection attempts reached');
    }
  });

  return socket;
};

/**
 * Get Socket.IO instance
 * @returns {Socket|null} Socket.IO instance or null if not initialized
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect Socket.IO connection
 * ARCHITECTURE: Clean disconnect to free resources
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
};

/**
 * Listen to unread count updates
 * ARCHITECTURE: Real-time event replaces polling
 * 
 * @param {Function} callback - Callback function(count, timestamp)
 * @returns {Function} Cleanup function to remove listener
 */
export const onUnreadCountUpdate = (callback) => {
  if (!socket) {
    console.warn('Socket.IO not initialized');
    return () => {};
  }

  socket.on('newUnreadCount', (data) => {
    callback(data.count, data.timestamp);
  });

  // Return cleanup function
  return () => {
    if (socket) {
      socket.off('newUnreadCount');
    }
  };
};

/**
 * Listen to approval status changes
 * ARCHITECTURE: Real-time event replaces polling
 * 
 * @param {Function} callback - Callback function(isApproved, timestamp)
 * @returns {Function} Cleanup function to remove listener
 */
export const onApprovalStatusChange = (callback) => {
  if (!socket) {
    console.warn('Socket.IO not initialized');
    return () => {};
  }

  socket.on('approvalStatusChanged', (data) => {
    callback(data.isApproved, data.timestamp);
  });

  // Return cleanup function
  return () => {
    if (socket) {
      socket.off('approvalStatusChanged');
    }
  };
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  onUnreadCountUpdate,
  onApprovalStatusChange
};

