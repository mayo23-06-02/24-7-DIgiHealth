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

  // Find practitioner
  const doc = await User.findOne({ role: 'practitioner' }).lean();
  console.log("Practitioner:", doc?.email);

  // Find conversations
  const convs = await Conversation.find({ practitionerId: doc?._id }).lean();
  console.log(`Found ${convs.length} conversations for practitioner.`);

  for (const conv of convs) {
    const patient = await User.findById(conv.patientId).lean();
    const msgCount = await Message.countDocuments({ conversationId: conv._id });
    console.log(`- Conv ID: ${conv._id}`);
    console.log(`  Patient: ${patient?.firstName} ${patient?.lastName} (${patient?.email})`);
    console.log(`  Messages in DB: ${msgCount}`);

    // Try simulating the API route query
    const queryStr = { conversationId: conv._id.toString() };
    const queryObj = { conversationId: conv._id };
    
    const msgsStr = await Message.find(queryStr).lean();
    const msgsObj = await Message.find(queryObj).lean();

    console.log(`  Query with String ID count: ${msgsStr.length}`);
    console.log(`  Query with ObjectId count: ${msgsObj.length}`);
  }

  process.exit(0);
}

main().catch(console.error);
