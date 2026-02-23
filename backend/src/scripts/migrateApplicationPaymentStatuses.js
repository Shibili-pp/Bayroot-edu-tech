/**
 * Migration script: Add "received" to Application payment 1, 2, 3 statuses
 * Run this once after deploying the status label changes to update existing database records
 *
 * Usage: node src/scripts/migrateApplicationPaymentStatuses.js
 */

const mongoose = require('mongoose');
const Student = require('../models/Student.model');
const StatusTimeline = require('../models/StatusTimeline.model');
require('dotenv').config();

const MIGRATIONS = {
  student: [
    { old: 'Application payment 1', new: 'Application payment 1 received' },
    { old: 'Application payment 2', new: 'Application payment 2 received' },
    { old: 'Application payment 3', new: 'Application payment 3 received' }
  ]
};

const migrateApplicationPaymentStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bayroot-edu');
    console.log('Connected to MongoDB');

    // Migrate Students
    let studentsUpdated = 0;
    for (const { old: oldStatus, new: newStatus } of MIGRATIONS.student) {
      const result = await Student.updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      );
      if (result.modifiedCount > 0) {
        studentsUpdated += result.modifiedCount;
        console.log(`Students: Updated ${result.modifiedCount} from "${oldStatus}" to "${newStatus}"`);
      }
    }
    console.log(`Total students updated: ${studentsUpdated}`);

    // Migrate StatusTimeline rules (fromStatus and toStatus)
    let timelineUpdated = 0;
    for (const { old: oldStatus, new: newStatus } of MIGRATIONS.student) {
      const fromResult = await StatusTimeline.updateMany(
        { fromStatus: oldStatus },
        { $set: { fromStatus: newStatus } }
      );
      const toResult = await StatusTimeline.updateMany(
        { toStatus: oldStatus },
        { $set: { toStatus: newStatus } }
      );
      if (fromResult.modifiedCount + toResult.modifiedCount > 0) {
        timelineUpdated += fromResult.modifiedCount + toResult.modifiedCount;
        console.log(`StatusTimeline: Updated fromStatus/toStatus "${oldStatus}" -> "${newStatus}"`);
      }
    }
    console.log(`Total StatusTimeline rules updated: ${timelineUpdated}`);

    await mongoose.disconnect();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

if (require.main === module) {
  migrateApplicationPaymentStatuses();
}

module.exports = migrateApplicationPaymentStatuses;
