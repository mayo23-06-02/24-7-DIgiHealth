import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import User from '../lib/models/User';
import Conversation from '../lib/models/Conversation';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  await mongoose.connect(uri);

  // Find a conversation
  const conv = await Conversation.findOne({}).lean();
  if (!conv) {
    console.error("No conversation found in DB");
    process.exit(1);
  }

  const convId = conv._id.toString();
  console.log(`Testing HTTP fetch for Conversation ID: ${convId}`);

  // Fetch messages from localhost dev server
  const url = `http://localhost:3000/api/chat/messages/direct/${convId}`;
  console.log(`Fetching: ${url}`);

  try {
    const res = await fetch(url);
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log("Response Body (first 500 chars):", text.slice(0, 500));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }

  // Also test direct conversation info fetch
  const urlInfo = `http://localhost:3000/api/chat/conversations/direct/${convId}`;
  console.log(`Fetching: ${urlInfo}`);
  try {
    const res = await fetch(urlInfo);
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log("Response Body (first 500 chars):", text.slice(0, 500));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
