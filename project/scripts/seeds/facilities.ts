import mongoose from 'mongoose';
import Facility from '../../lib/models/Facility';

export async function createFacilities() {
  // Clear existing
  await Facility.deleteMany({});

  const hospital = await Facility.create({
    name: 'Netcare Milpark Hospital',
    facilityType: 'Private Hospital',
    address: {
      street: '9 Guild Rd',
      city: 'Parktown',
      province: 'Gauteng',
    },
    specialties: ['Cardiology', 'Emergency Medicine', 'Oncology', 'Neurology'],
    bedCapacity: 30,
    contact: {
        phone: '+27 11 480 5600',
        email: 'info@netcare.co.za'
    }
  });

  console.log('🏥 Hospital created: Netcare Milpark Hospital');
  return hospital;
}
