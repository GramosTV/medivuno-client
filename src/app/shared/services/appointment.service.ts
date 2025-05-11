import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Define interfaces to match the backend models
export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Appointment {
  id: string;
  patient: Patient;
  doctor: Doctor;
  appointmentDateTime: string; // ISO date string
  durationMinutes: number;
  status: AppointmentStatus;
  reasonForVisit?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  doctorId: string;
  appointmentDateTime: string;
  durationMinutes?: number;
  reasonForVisit?: string;
  notes?: string;
}

export interface UpdateAppointmentStatusDto {
  status: AppointmentStatus;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private apiUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  // Get appointments for the current patient
  getPatientAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient`);
  }

  // Get appointments for the current doctor (admin)
  getDoctorAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/doctor`);
  }

  // Create a new appointment
  createAppointment(
    appointment: CreateAppointmentDto
  ): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment);
  }

  // Get a specific appointment by ID
  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  // Update an appointment
  updateAppointment(
    id: string,
    appointment: Partial<CreateAppointmentDto>
  ): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment);
  }

  // Update appointment status
  updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
  ): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, {
      status,
    });
  }

  // Cancel an appointment
  cancelAppointment(id: string): Observable<Appointment> {
    return this.updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
  }

  // Delete an appointment
  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Helper method to format appointment data for display
  formatAppointmentForDisplay(appointment: Appointment) {
    return {
      id: appointment.id,
      doctorName: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
      specialty: appointment.doctor.specialization || 'General',
      date: new Date(appointment.appointmentDateTime)
        .toISOString()
        .split('T')[0],
      time: new Date(appointment.appointmentDateTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status:
        appointment.status.charAt(0) +
        appointment.status.slice(1).toLowerCase(), // Convert CONFIRMED to Confirmed
      reasonForVisit: appointment.reasonForVisit,
      notes: appointment.notes,
      fullDateTime: new Date(appointment.appointmentDateTime),
    };
  }

  // Get upcoming appointments for the current patient, formatted for display
  getUpcomingPatientAppointments(): Observable<any[]> {
    return this.getPatientAppointments().pipe(
      map((appointments) => {
        const now = new Date();
        return appointments
          .filter((appt) => new Date(appt.appointmentDateTime) > now)
          .filter((appt) => appt.status !== AppointmentStatus.CANCELLED)
          .map((appt) => this.formatAppointmentForDisplay(appt))
          .sort((a, b) => a.fullDateTime.getTime() - b.fullDateTime.getTime());
      })
    );
  }

  // Get past appointments for the current patient, formatted for display
  getPastPatientAppointments(): Observable<any[]> {
    return this.getPatientAppointments().pipe(
      map((appointments) => {
        const now = new Date();
        return appointments
          .filter((appt) => {
            const appointmentDate = new Date(appt.appointmentDateTime);
            return (
              appointmentDate < now ||
              appt.status === AppointmentStatus.CANCELLED
            );
          })
          .map((appt) => this.formatAppointmentForDisplay(appt))
          .sort((a, b) => b.fullDateTime.getTime() - a.fullDateTime.getTime()); // Newest first
      })
    );
  }

  // Get all doctors (needed for appointment booking)
  getAllDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${environment.apiUrl}/users/doctors`);
  }
}
