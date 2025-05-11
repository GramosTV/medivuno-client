export interface BackendDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  // Add other relevant doctor fields if needed
}

export interface BackendAppointment {
  id: string;
  doctor: BackendDoctor; // Assuming the backend populates doctor details
  patientId: string; // Or this might not be needed if it's always for the logged-in user
  appointmentDateTime: string; // ISO Date string e.g., "2025-05-15T10:00:00.000Z"
  durationMinutes?: number; // Optional: duration of the appointment
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; // Example statuses
  notes?: string; // Optional
  // Add any other relevant fields like 'reasonForVisit', 'type', etc.
}
