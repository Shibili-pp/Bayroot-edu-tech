/**
 * Migration script to initialize statusUpdatedAt for existing students
 * Run this once to set statusUpdatedAt = createdAt for students that don't have it
 */

const mongoose = require('mongoose');
const Student = require('../models/Student.model');
require('dotenv').config();

const initializeStatusUpdatedAt = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bayroot-edu');
    console.log('Connected to MongoDB');

    // Find all students without statusUpdatedAt or with null statusUpdatedAt
    const students = await Student.find({
      $or: [
        { statusUpdatedAt: { $exists: false } },
        { statusUpdatedAt: null }
      ]
    });

    console.log(`Found ${students.length} students without statusUpdatedAt`);

    // Update each student to set statusUpdatedAt = createdAt
    let updated = 0;
    for (const student of students) {
      await Student.updateOne(
        { _id: student._id },
        { $set: { statusUpdatedAt: student.createdAt } }
      );
      updated++;
      console.log(`Updated student ${student.fullName} (${student._id})`);
    }

    console.log(`Successfully updated ${updated} students`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error initializing statusUpdatedAt:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeStatusUpdatedAt();
}

module.exports = initializeStatusUpdatedAt;

