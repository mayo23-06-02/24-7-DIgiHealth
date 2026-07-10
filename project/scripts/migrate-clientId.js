/**
 * Migration script to add clientId field to existing Message documents
 * Run with: node scripts/migrate-clientId.js
 */

const mongoose = require('mongoose');
const Message = require('../lib/models/Message');

async function migrate() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count total messages
    const totalCount = await Message.countDocuments();
    console.log(`Total messages to process: ${totalCount}`);

    // Add clientId field to existing messages (set to null for existing messages)
    const result = await Message.updateMany(
      { clientId: { $exists: false } },
      { $set: { clientId: null } }
    );

    console.log(`Migration complete: ${result.modifiedCount} messages updated`);

    // Verify the update
    const withoutClientId = await Message.countDocuments({ clientId: { $exists: false } });
    if (withoutClientId > 0) {
      console.warn(`Warning: ${withoutClientId} messages still without clientId field`);
    } else {
      console.log('All messages now have clientId field');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
