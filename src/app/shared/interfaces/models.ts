/**
 * Interface definitions that match the Go backend models
 */

// User role types to match backend
export type UserRole = 'admin' | 'doctor' | 'patient' | 'user';

// User profile model matching the Go backend
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  dateOfBirth?: string; // optional fields
  phoneNumber?: string;
  address?: string;
  profileImage?: string;
  isVerified?: boolean; // Made optional for backward compatibility
  createdAt?: string; // Made optional for backward compatibility
  updatedAt?: string; // Made optional for backward compatibility
}

// Authentication responses
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// Appointment status to match backend
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'rescheduled';

// Appointment model matching the Go backend
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  isFollowUp: boolean;
  createdAt: string;
  updatedAt: string;
  // These would come from expanded relations if requested
  patient?: User;
  doctor?: User;
}

// Medical record type to match backend
export type MedicalRecordType =
  | 'ConsultationNote'
  | 'LabResult'
  | 'Prescription'
  | 'ImagingReport'
  | 'VaccinationRecord'
  | 'AllergyRecord'
  | 'DischargeSummary';

// Medical record model matching the Go backend
export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  recordType: MedicalRecordType;
  recordDate: string; // ISO string
  title: string;
  department?: string;
  summary: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
  // Expanded relations
  attachments?: MedicalRecordAttachment[];
}

export interface MedicalRecordAttachment {
  id: string;
  medicalRecordId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

// Message status to match backend
export type MessageStatus = 'sent' | 'delivered' | 'read';

// Message model matching the Go backend
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  parentId?: string;
  subject?: string;
  content: string;
  status: MessageStatus;
  readAt?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  // Expanded relations
  sender?: User;
  receiver?: User;
}
