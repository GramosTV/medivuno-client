export type MedicalRecordType =
  | 'ConsultationNote'
  | 'LabResult'
  | 'Prescription'
  | 'ImagingReport'
  | 'VaccinationRecord'
  | 'AllergyRecord'
  | 'DischargeSummary';

export interface MedicalRecordAttachment {
  fileName: string;
  fileType: string; // e.g., 'application/pdf', 'image/jpeg'
  url: string; // URL to view/download the attachment
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: MedicalRecordType;
  date: Date;
  title: string; // e.g., 'Annual Check-up', 'Blood Test Results - CBC'
  doctorName: string;
  department?: string; // e.g., 'General Medicine', 'Cardiology'
  summary?: string; // Brief overview or key findings
  details?: string; // More comprehensive information, notes, or results
  attachments?: MedicalRecordAttachment[];
}
