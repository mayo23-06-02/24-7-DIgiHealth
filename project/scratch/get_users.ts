import mongoose from 'mongoose';
import User from '../lib/models/User';
import bcrypt from 'bcryptjs';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'christine_zulauf@hotmail.com';
  const u = await User.findOne({ email });
  console.log('Lookup by Exact:', u?.email);

  // Fallback case-insensitive
  const ui = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  console.log('Lookup by Case-Insensitive:', ui?.email);
  
  if (ui) {
    console.log('Role:', ui.role);
    const isMatch = await bcrypt.compare('Password123!', ui.passwordHash);
    console.log('Password123! matches?', isMatch);
  }
  process.exit(0);
}
run();
