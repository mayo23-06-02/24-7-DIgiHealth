import mongoose from 'mongoose';
import Consultation from '../../lib/models/Consultation';

const COMPLAINTS = [
  'Headache and lightheadedness',
  'Chest tightness during exercise',
  'Shortness of breath',
  'Follow-up on blood pressure',
  'Flu-like symptoms',
  'Medication refill check',
  'Diabetes management review'
];

export async function createConsultations(patients: any[], doctors: any[], hospital: any) {
  const [patient1, patient2] = patients;
  const [doctor1, doctor2] = doctors;

  // Clear existing
  await Consultation.deleteMany({ practitionerId: { $in: [doctor1._id, doctor2._id] } });

  const statuses: ('scheduled' | 'completed' | 'cancelled')[] = ['scheduled', 'completed', 'cancelled'];
  const created = [];

  for (const doctor of [doctor1, doctor2]) {
    for (const status of statuses) {
      const count = status === 'cancelled' ? 5 : 10;
      for (let i = 0; i < count; i++) {
        const patient = i % 2 === 0 ? patient1 : patient2;
        const type = i % 3 === 0 ? 'video' : (i % 3 === 1 ? 'chat' : 'in_person');
        
        let startTime: Date;
        if (status === 'scheduled') {
           // Future
           startTime = new Date();
           startTime.setDate(startTime.getDate() + i + 1);
           startTime.setHours(9 + (i % 8), 0, 0, 0);
        } else {
           // Past
           startTime = new Date();
           startTime.setDate(startTime.getDate() - (i + 1));
           startTime.setHours(9 + (i % 8), 0, 0, 0);
        }
        
        const endTime = new Date(startTime.getTime() + 30 * 60000);
        
        const c = await Consultation.create({
          patientId: patient._id,
          practitionerId: doctor._id,
          facilityId: hospital._id,
          type,
          status,
          scheduledStartTime: startTime,
          scheduledEndTime: endTime,
          chiefComplaint: COMPLAINTS[i % COMPLAINTS.length],
          clinicalRisk: {
            score: 20 + Math.floor(Math.random() * 60),
            color: 'amber',
            factors: ['Symptom monitoring', 'Follow-up']
          },
          ...(status === 'completed' && {
            soapNotes: {
              subjective: 'Patient reports mild improvement in symptoms since last visit.',
              objective: 'BP 130/85, HR 72bpm. Patient appears stable.',
              assessment: 'Condition stable, continuing current management plan.',
              plan: 'Continue medications. Follow up in 2 weeks.',
              signedAt: endTime
            }
          })
        });
        created.push(c);
      }
    }
  }

  console.log(`📅 Consultation history seeded (~50 appointments)`);
}
