import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Import interfaces from our shared models
import {
  Appointment as AppointmentModel,
  AppointmentStatus as AppointmentStatusType,
  User,
} from '../interfaces/models';

// We need to keep an AppointmentStatus enum for the existing code
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
}

// Additional interfaces specific to appointments
export interface Doctor extends User {
  specialization?: string;
}

export interface Patient extends User {
  // Additional patient-specific fields can go here
}

// Use our shared model as the base and add frontend-specific fields
export interface Appointment extends AppointmentModel {
  // Frontend-specific computed properties
  doctor?: Doctor;
  patient?: Patient;
  appointmentDateTime?: string; // For backward compatibility
  reasonForVisit?: string; // For backward compatibility
  durationMinutes?: number; // For backward compatibility
  fullDateTime?: Date; // For sorting and formatting
  formattedDate?: string; // For display
  formattedTime?: string; // For display
}

// Update the DTO to match the Go backend
export interface CreateAppointmentDto {
  doctorId: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentStatusDto {
  status: AppointmentStatusType;
  notes?: string;
}

export interface RescheduleAppointmentDto {
  newAppointmentAt: string; // ISO date string
  notes?: string;
}

// Response wrapper from Go backend
interface ApiResponse<T> {
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  // Updated to use the Go backend API structure
  private apiUrl = `${environment.apiUrl}/api/v1/appointments`;

  // Subject for local event emissions
  private appointmentUpdateSource = new Subject<{
    action: 'created' | 'updated' | 'cancelled' | 'rescheduled' | 'reminder';
    appointment: Appointment;
  }>();

  // Observable for components to subscribe to local events
  appointmentUpdate$ = this.appointmentUpdateSource.asObservable();

  constructor(private http: HttpClient) {}
  // Get appointments for the current patient
  getPatientAppointments(): Observable<Appointment[]> {
    return this.http
      .get<ApiResponse<Appointment[]>>(`${this.apiUrl}`)
      .pipe(map((response) => this.processAppointments(response.data)));
  }
  // Get appointments for the current doctor (admin)
  getDoctorAppointments(): Observable<Appointment[]> {
    // Fix: Use the generic endpoint instead of /doctor which doesn't exist on the backend
    // The backend differentiates based on the user's role from the JWT token
    return this.http
      .get<ApiResponse<Appointment[]>>(`${this.apiUrl}`)
      .pipe(map((response) => this.processAppointments(response.data)));
  }

  // Get appointments for the current user (patient or doctor)
  getAppointmentsForUser(): Observable<Appointment[]> {
    return this.http
      .get<ApiResponse<Appointment[]>>(`${this.apiUrl}`)
      .pipe(map((response) => this.processAppointments(response.data)));
  }

  // Method for backward compatibility
  getAvailableDoctors(): Observable<Doctor[]> {
    return this.http
      .get<ApiResponse<Doctor[]>>(`${environment.apiUrl}/api/v1/users/doctors`)
      .pipe(map((response) => response.data));
  }

  // Compatibility method for getting all doctors
  getAllDoctors(): Observable<Doctor[]> {
    return this.getAvailableDoctors();
  }

  // Process appointments to add frontend-specific properties
  private processAppointments(appointments: Appointment[]): Appointment[] {
    return appointments.map((appointment) => {
      const startDate = new Date(appointment.startTime);
      const endDate = new Date(appointment.endTime);

      // Calculate duration in minutes for backward compatibility
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      return {
        ...appointment,
        appointmentDateTime: appointment.startTime, // Maintain backward compatibility
        reasonForVisit: appointment.reason, // Maintain backward compatibility
        durationMinutes: durationMinutes, // Add duration in minutes
        fullDateTime: startDate,
        formattedDate: this.formatDate(startDate),
        formattedTime: this.formatTime(startDate),
      };
    });
  }

  // Format date for display
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Format time for display
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Create a new appointment
  createAppointment(
    appointment: CreateAppointmentDto
  ): Observable<Appointment> {
    return this.http
      .post<ApiResponse<Appointment>>(this.apiUrl, appointment)
      .pipe(
        map((response) => {
          const processedAppointment = this.processAppointments([
            response.data,
          ])[0];
          this.appointmentUpdateSource.next({
            action: 'created',
            appointment: processedAppointment,
          });
          return processedAppointment;
        })
      );
  }

  // Get a specific appointment by ID
  getAppointmentById(id: string): Observable<Appointment> {
    return this.http
      .get<ApiResponse<Appointment>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.processAppointments([response.data])[0]));
  }

  // Update appointment status
  updateAppointmentStatus(
    id: string,
    statusUpdate: UpdateAppointmentStatusDto
  ): Observable<Appointment> {
    return this.http
      .patch<ApiResponse<Appointment>>(
        `${this.apiUrl}/${id}/status`,
        statusUpdate
      )
      .pipe(
        map((response) => {
          const updatedAppointment = this.processAppointments([
            response.data,
          ])[0];
          this.appointmentUpdateSource.next({
            action: 'updated',
            appointment: updatedAppointment,
          });
          return updatedAppointment;
        })
      );
  }

  // Reschedule an appointment
  rescheduleAppointment(
    id: string,
    rescheduleData: RescheduleAppointmentDto
  ): Observable<Appointment> {
    return this.http
      .patch<ApiResponse<Appointment>>(
        `${this.apiUrl}/${id}/reschedule`,
        rescheduleData
      )
      .pipe(
        map((response) => {
          const updatedAppointment = this.processAppointments([
            response.data,
          ])[0];
          this.appointmentUpdateSource.next({
            action: 'rescheduled',
            appointment: updatedAppointment,
          });
          return updatedAppointment;
        })
      );
  }

  // Cancel an appointment
  cancelAppointment(id: string): Observable<Appointment> {
    const cancelData = {
      status: 'cancelled' as AppointmentStatusType,
    };
    return this.updateAppointmentStatus(id, cancelData);
  }

  // Get upcoming appointments
  getUpcomingAppointments(): Observable<Appointment[]> {
    return this.getPatientAppointments().pipe(
      map((appointments) => {
        const now = new Date();
        return appointments
          .filter((appointment) => {
            const appointmentDate = new Date(appointment.startTime);
            return (
              appointmentDate > now &&
              appointment.status !== 'cancelled' &&
              appointment.status !== 'completed'
            );
          })
          .sort((a, b) => {
            const dateA = new Date(a.startTime);
            const dateB = new Date(b.startTime);
            return dateA.getTime() - dateB.getTime(); // Ascending by date
          });
      })
    );
  }

  // Get past appointments for the current patient
  getPastAppointments(): Observable<Appointment[]> {
    return this.getPatientAppointments().pipe(
      map((appointments) => {
        const now = new Date();
        return appointments
          .filter((appointment) => {
            const appointmentDate = new Date(appointment.startTime);
            return appointmentDate < now || appointment.status === 'completed';
          })
          .sort((a, b) => {
            const dateA = new Date(a.startTime);
            const dateB = new Date(b.startTime);
            return dateB.getTime() - dateA.getTime(); // Descending by date (newest first)
          });
      })
    );
  }

  // Get available timeslots for a doctor
  getAvailableTimeslots(doctorId: string, date: string): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(
        `${this.apiUrl}/available-slots?doctorId=${doctorId}&date=${date}`
      )
      .pipe(map((response) => response.data));
  }
}
