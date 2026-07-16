export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    conversationId?: string;
    messageId?: string;
    prescriptionId?: string;
    patientId?: string;
    documentUrl?: string | null;
    medicationName?: string;
    recordId?: string;
    fileUrl?: string;
    type?: string;
    /** Present on appointment_reschedule_request notifications */
    consultationId?: string;
    proposedStart?: string;
    proposedEnd?: string;
    [key: string]: unknown;
  };
}

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  icon?: React.ReactNode;
}
