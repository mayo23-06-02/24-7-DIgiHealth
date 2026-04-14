import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Facility } from '@/lib/models/Facility';

export async function GET() {
  try {
    await connectToDatabase();
    const facilities = await Facility.find();
    
    const mapped = facilities.map(f => ({
      id: f._id.toString(),
      name: f.name,
      type: f.facilityType,
      address: `${f.address.street}, ${f.address.city}`,
      distance: (Math.random() * 10 + 0.5).toFixed(1),
      waitTime: f.currentWaitTimeMins,
      isOpen: f.isOpen,
      rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
      image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=400",
      phone: f.contactInfo.phone,
      emergencyPhone: f.contactInfo.emergencyPhone,
      email: f.contactInfo.email,
      website: "www.telehealth-facility.com",
      location: f.address.city,
      accreditations: ["HPCSA Registered", "Dept of Health"],
      departments: f.specialties || ["General"],
      bedAvailability: { general: `${f.bedCapacity.generalAvailable} Available`, icu: `${f.bedCapacity.icuAvailable} Available` },
      specialists: [],
      languages: ["English", "isiZulu", "Afrikaans"],
      insurance: ["Discovery", "Cash"],
      amenities: { wheelchair: true, parking: true, pharmacy: true, radiology: true, emergency247: f.emergencyServices },
      realTimeData: { occupancy: Math.floor(Math.random() * 95) + 5, patientsWaiting: Math.floor(Math.random() * 20), estTimeToSeeDoctor: f.currentWaitTimeMins, ambulanceBayAvailable: true }
    }));
    
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
  }
}
