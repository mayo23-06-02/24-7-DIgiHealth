import bcrypt from 'bcryptjs';
import User from '../../lib/models/User';
import { EMTProfile } from '../../lib/models/RoleProfiles';
import Facility from '../../lib/models/Facility';

export async function createEMT() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const hospital = await Facility.findOne({ name: 'Netcare Milpark Hospital' });

  // Clear existing
  await User.deleteMany({ role: 'emt' });
  await EMTProfile.deleteMany({});

  const emtUser = await User.create({
    email: 'john.rescuer@24-7.co.za',
    passwordHash: passwordHash,
    role: 'emt',
    firstName: 'John',
    lastName: 'Rescuer',
    status: 'active',
    mobile: '+27711223344',
  });

  const emtProfile = await EMTProfile.create({
    userId: emtUser._id,
    licenseLevel: 'ALS',
    hpcsaNumber: 'ANT0098765',
    assignedVehicle: 'AMB-MILPARK-01',
    assignedFacilityId: hospital?._id,
    currentStatus: 'available',
  });

  console.log('🚑 EMT created: John Rescuer');
  return emtUser;
}
