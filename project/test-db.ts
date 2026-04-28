import mongoose from 'mongoose';
import User from './lib/models/User';
import bcrypt from 'bcryptjs';

const MONGODB_URI="mongodb://Mayo:ozl2Fd51bM1uhEZm@ac-xtoaiei-shard-00-00.cqsjwqi.mongodb.net:27017,ac-xtoaiei-shard-00-01.cqsjwqi.mongodb.net:27017,ac-xtoaiei-shard-00-02.cqsjwqi.mongodb.net:27017/digihealth?ssl=true&replicaSet=atlas-r7ie47-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0"

async function main() {
  await mongoose.connect(MONGODB_URI);
  const hash = await bcrypt.hash('password123', 10);
  await User.updateMany({ role: { $in: ['hospital_admin', 'super_admin', 'mega_admin'] } }, { passwordHash: hash });
  const admins = await User.find({ role: { $in: ['hospital_admin', 'super_admin', 'mega_admin'] } }).lean();
  console.log("Updated Admins:");
  admins.forEach(a => console.log(a.email, a.role));
  process.exit(0);
}
main().catch(console.error);
