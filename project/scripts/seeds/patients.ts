import bcrypt from 'bcryptjs';
import User from '../../lib/models/User';
import { PatientProfile } from '../../lib/models/RoleProfiles';

export async function createPatients() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Clear existing
  await User.deleteMany({ role: 'patient' });
  // Profiles are unique per userId, so better clear them too
  await PatientProfile.deleteMany({});

  const patient1 = await User.create({
    email: 'thandiwe.mokoena@example.com',
    passwordHash: passwordHash,
    role: 'patient',
    firstName: 'Thandiwe',
    lastName: 'Mokoena',
    status: 'active',
    saId: '9003125441088',
    mobile: '+27725551234',
  });

  await PatientProfile.create({
    userId: patient1._id,
    dateOfBirth: new Date('1990-03-12'),
    gender: 'female',
    emergencyContact: { 
      name: 'Sizwe Mokoena', 
      phone: '+27825559876', 
      relationship: 'Brother' 
    },
    medicalAid: { 
      provider: 'Discovery Health', 
      planName: 'Classic Priority', 
      memberNumber: '987654321' 
    },
    subscriptionTier: 'pro',
    popiaConsentDate: new Date(),
  });

  const patient2 = await User.create({
    email: 'john.dlamini@example.com',
    passwordHash: passwordHash,
    role: 'patient',
    firstName: 'John',
    lastName: 'Dlamini',
    status: 'active',
    saId: '8502155222089',
    mobile: '+27763334455',
  });

  await PatientProfile.create({
    userId: patient2._id,
    dateOfBirth: new Date('1985-02-15'),
    gender: 'male',
    emergencyContact: { 
      name: 'Maria Dlamini', 
      phone: '+27824448899', 
      relationship: 'Spouse' 
    },
    medicalAid: { 
      provider: 'Bonitas', 
      planName: 'Standard', 
      memberNumber: '123456789' 
    },
    subscriptionTier: 'free',
    popiaConsentDate: new Date(),
  });

  console.log('🧑‍🤝‍🧑 Patients created: Thandiwe Mokoena & John Dlamini');
  return { patient1, patient2 };
}
