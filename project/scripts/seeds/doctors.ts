import bcrypt from 'bcryptjs';
import User from '../../lib/models/User';
import { PractitionerProfile } from '../../lib/models/RoleProfiles';

export async function createDoctors() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Clear existing
  await User.deleteMany({ role: 'practitioner' });
  await PractitionerProfile.deleteMany({});

  const doctor1 = await User.create({
    email: 'dr.oliver@24-7.co.za',
    passwordHash: passwordHash,
    role: 'practitioner',
    firstName: 'Oliver',
    lastName: 'Mitchell',
    status: 'active',
    mobile: '+27821234567',
  });

  await PractitionerProfile.create({
    userId: doctor1._id,
    specialisation: 'General Practitioner',
    hpcsaNumber: 'MP0123456',
    experienceYears: 12,
    bio: 'Experienced GP specialising in chronic disease management and preventive care.',
    languages: ['English', 'Afrikaans', 'Zulu'],
    acceptedMedicalAids: ['Discovery Health', 'Bonitas', 'Momentum'],
    rating: 4.8,
    reviewCount: 124,
    isOnline: true,
    bankAccount: {
      accountHolder: 'Oliver Mitchell',
      bankName: 'FNB',
      accountNumber: '62000123456',
      branchCode: '250655',
      taxNumber: '1234567890',
    },
  });

  const doctor2 = await User.create({
    email: 'dr.anke@24-7.co.za',
    passwordHash: passwordHash,
    role: 'practitioner',
    firstName: 'Anke',
    lastName: 'van Wyk',
    status: 'active',
    mobile: '+27837890123',
  });

  await PractitionerProfile.create({
    userId: doctor2._id,
    specialisation: 'Cardiologist',
    hpcsaNumber: 'MP0789012',
    experienceYears: 15,
    bio: 'Cardiologist specialising in cardiac risk stratification and heart failure management.',
    languages: ['English', 'Afrikaans'],
    acceptedMedicalAids: ['Discovery Health', 'Bonitas'],
    rating: 4.9,
    reviewCount: 89,
    isOnline: true,
    bankAccount: {
      accountHolder: 'Anke van Wyk',
      bankName: 'Standard Bank',
      accountNumber: '10123456789',
      branchCode: '000123',
      taxNumber: '0987654321',
    },
  });

  console.log('👨‍⚕️ Doctors created: Dr. Oliver Mitchell & Dr. Anke van Wyk');
  return { doctor1, doctor2 };
}
