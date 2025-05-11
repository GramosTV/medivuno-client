export interface Message {
  id: string;
  sender: 'patient' | 'doctor';
  senderName: string; // Name of the person who sent the message
  receiverName: string; // Name of the person who should receive the message
  patientId?: string; // Optional: if sender is patient or message is about a patient
  doctorId?: string; // Optional: if sender is doctor or message is about a doctor
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  isSenderDoctor?: boolean; // Helper to identify if the doctor sent this specific message
}
