import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import User from '../lib/models/User';
import Conversation from '../lib/models/Conversation';
import Message from '../lib/models/Message';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const convs = await Conversation.find({}).lean();
  console.log(`=== Total Conversations in DB: ${convs.length} ===`);
  
  for (const conv of convs) {
    const patient = await User.findById(conv.patientId).lean();
    const practitioner = await User.findById(conv.practitionerId).lean();
    const msgs = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).lean();
    
    console.log(`Conv: ${conv._id}`);
    console.log(`  Patient: ${patient?.firstName} ${patient?.lastName} (${patient?.email})`);
    console.log(`  Practitioner: Dr. ${practitioner?.firstName} ${practitioner?.lastName} (${practitioner?.email})`);
    console.log(`  Messages Count: ${msgs.length}`);
    if (msgs.length > 0) {
      console.log(`  First message: "${msgs[0].content}" (sender: ${msgs[0].senderId})`);
      console.log(`  Last message: "${msgs[msgs.length - 1].content}"`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
