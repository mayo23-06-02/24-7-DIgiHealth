const mongoose = require('mongoose');

async function fixConversationIndex() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';
  console.log('Connecting to', uri.replace(/:([^:@]{1,})@/, ':****@'));
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const collection = mongoose.connection.collection('conversations');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    const targetIndex = indexes.find(idx => idx.name === 'consultationId_1');
    
    if (targetIndex && targetIndex.unique) {
      console.log('Detected unique index on consultationId. Dropping and recreating as sparse...');
      await collection.dropIndex('consultationId_1');
      console.log('Index dropped.');
      
      await collection.createIndex({ consultationId: 1 }, { unique: true, sparse: true, background: true });
      console.log('Sparse unique index created.');
    } else {
      console.log('No unique index on consultationId found or already fixed.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

fixConversationIndex();
