import mongoose from 'mongoose';
import Conversation from '../../lib/models/Conversation';
import Message from '../../lib/models/Message';

const SAMPLE_TEXTS = [
  "Hi Doctor, I wanted to follow up on my recent tests.",
  "Hello! Yes, I've received the results. We should discuss them briefly.",
  "Is there anything I should be concerned about?",
  "Nothing critical, but we might need to adjust your dosage.",
  "Thank you. I'll book a slot for tomorrow.",
  "Sounds good. See you then.",
  "I'm feeling a bit dizzy today.",
  "Please monitor your blood pressure and send me the reading.",
  "It's 145 over 92.",
  "A bit high. Take your medication and rest. If it doesn't go down in 2 hours, let me know."
];

export async function createMessages(patients: any[], doctors: any[]) {
  const [patient1, patient2] = patients;
  const [doctor1, doctor2] = doctors;

  // Clear existing
  await Conversation.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } });
  await Message.deleteMany({ senderId: { $in: [patient1._id, patient2._id, doctor1._id, doctor2._id] } });

  for (const patient of [patient1, patient2]) {
    for (const doctor of [doctor1, doctor2]) {
      // 1-2 conversations per pair
      const convCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < convCount; i++) {
        const conv = await Conversation.create({
          patientId: patient._id,
          practitionerId: doctor._id,
          status: i === 0 ? 'active' : 'ended',
          minutesAllocated: 30,
          minutesUsed: 15,
          startedAt: new Date(Date.now() - (i + 1) * 86400000),
          lastActivityAt: new Date()
        });

        // 10-15 messages per conversation
        const msgCount = 10 + Math.floor(Math.random() * 6);
        for (let j = 0; j < msgCount; j++) {
          const isFromPatient = j % 2 === 0;
          await Message.create({
            conversationId: conv._id,
            senderId: isFromPatient ? patient._id : doctor._id,
            receiverId: isFromPatient ? doctor._id : patient._id,
            content: SAMPLE_TEXTS[j % SAMPLE_TEXTS.length],
            type: j === 5 ? 'image' : 'text',
            fileUrl: j === 5 ? 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=400' : undefined,
            isRead: j < msgCount - 2,
            deliveredAt: new Date(conv.startedAt.getTime() + j * 3600000),
            createdAt: new Date(conv.startedAt.getTime() + j * 3600000)
          });
        }
      }
    }
  }

  console.log('💬 Secure messages seeded (4+ active conversations)');
}
