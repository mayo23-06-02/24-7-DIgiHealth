import { connectToDatabase } from './lib/mongodb.js';
import User from './lib/models/User.js';
import bcrypt from 'bcryptjs';

async function main() {
  await connectToDatabase();
  const hash = await bcrypt.hash('password123', 10);
  await User.updateMany({ role: { $in: ['hospital_admin', 'super_admin', 'mega_admin'] } }, { passwordHash: hash });
  const admins = await User.find({ role: { $in: ['hospital_admin', 'super_admin', 'mega_admin'] } }).lean();
  console.log("Updated Admins:");
  admins.forEach(a => console.log(a.email, a.role));
  process.exit(0);
}
main().catch(console.error);
