const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  try {
    // Connection options for better error handling
    // Disable buffering - fail fast if not connected
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 5000, // Give up initial connection after 5s
      bufferCommands: false, // Disable mongoose buffering - fail fast if not connected
    };

    await mongoose.connect(MONGO_URI, options);
    console.log('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.error('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Don't exit immediately - allow server to start but log the error
    // This way the server can still respond with proper error messages
  }
};

// Helper function to check if MongoDB is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

module.exports = { connectDB, isConnected };




