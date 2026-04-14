// Mocked API client for Patient Dashboard
const DELAY = 800;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const patientApi = {
  getDashboardData: async () => {
    await delay(DELAY);
    return {
      user: { name: "Thandiwe", id: "9001015012084", mobile: "+27821234567", email: "thandiwe.m@example.com" },
      subscription: { status: "Active", nextBillingDate: "2026-05-01", amount: 150 },
      recentVisits: [
        { id: 1, date: "2026-03-20", doctor: "Dr. Mokoena", speciality: "General Practitioner", summary: "Routine checkup. Blood pressure normal." }
      ],
      prescriptions: [
        { id: 1, medication: "Amoxicillin 500mg", refills: 0 }
      ],
      triageHistory: []
    };
  },

  getNearbyFacilities: async (lat: number, lng: number) => {
    await delay(DELAY);
    return [
      { id: "1", name: "Joburg Gen (Charlotte Maxeke)", type: "Public", waitTime: 120, distance: 4.2, isER: true },
      { id: "2", name: "Netcare Milpark", type: "Private", waitTime: 15, distance: 5.5, isER: true },
      { id: "3", name: "Rosebank Clinic", type: "Private", waitTime: 30, distance: 7.1, isER: false },
    ];
  },

  bookConsultation: async () => {
    await delay(DELAY + 500);
    return { success: true, message: "Consultation booked successfully." };
  },

  triageSymptoms: async (symptoms: string) => {
    await delay(DELAY + 1000);
    const low = symptoms.toLowerCase();
    if (low.includes("chest") || low.includes("heart") || low.includes("breath") || low.includes("blood")) {
        return { level: "red", advice: "Seek emergency care immediately. High risk symptoms detected.", isEmergency: true };
    }
    if (low.includes("fever") || low.includes("pain") || low.includes("cough")) {
        return { level: "teal", advice: "A virtual consultation is recommended. A doctor can prescribe medication.", isEmergency: false };
    }
    return { level: "green", advice: "Rest and hydrate. Take over-the-counter paracetamol. Monitor for 24 hours.", isEmergency: false };
  },

  managePayment: async () => {
    await delay(DELAY);
    return { url: "https://peachpayments.com/mock-redirect?token=123" };
  },
  
  getAuditLog: async () => {
    await delay(DELAY);
    return [
      { id: 1, date: "2026-04-03T10:00:00Z", actor: "Dr. Nkosi", reason: "Consultation Review" },
      { id: 2, date: "2026-04-01T14:30:00Z", actor: "System", reason: "Automated Backup" }
    ];
  }
};
