const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

/**
 * Connect to MongoDB with retry logic and exponential backoff
 * REFACTORED: Added retry mechanism (5 attempts) with exponential backoff
 * If all retries fail, gracefully exit to prevent server running without DB
 */
const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const baseDelay = 1000; // Start with 1 second delay

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
    console.error(`MongoDB connection error (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
    
    // REFACTORED: Retry with exponential backoff
    if (retryCount < maxRetries - 1) {
      // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`Retrying MongoDB connection in ${delay / 1000} seconds...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Recursive retry
      return connectDB(retryCount + 1);
    } else {
      // REFACTORED: All retries exhausted - gracefully exit
      // Server cannot function without database connection
      console.error('Failed to connect to MongoDB after', maxRetries, 'attempts');
      console.error('Exiting process to prevent server from running without database connection');
      console.error('Please ensure MongoDB is running and MONGO_URI is correct');
      process.exit(1); // Exit with error code
    }
  }
};

// Helper function to check if MongoDB is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

module.exports = { connectDB, isConnected };




