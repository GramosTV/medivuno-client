import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarView } from 'angular-calendar';
import { format, startOfDay, endOfDay, addHours, isSameDay } from 'date-fns';

import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../shared/calendar-view/calendar-view.component';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../shared/services/appointment.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, CalendarViewComponent],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss',
})
export class AppointmentsComponent implements OnInit {
  scheduledAppointments: Appointment[] = [];
  loading = false;
  error: string | null = null;

  // Calendar properties
  view: CalendarView = CalendarView.Month;
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  activeDayIsOpen: boolean = false;
  CalendarView = CalendarView;

  // For status updates
  updatingAppointmentId: string | null = null;

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = null;

    this.appointmentService
      .getDoctorAppointments()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (appointments) => {
          console.log('Doctor appointments loaded:', appointments);
          this.scheduledAppointments = appointments;
          this.loadCalendarEvents();
        },
        error: (error) => {
          console.error('Error loading doctor appointments:', error);
          this.error = 'Failed to load appointments. Please try again.';
        },
      });
  }

  loadCalendarEvents(): void {
    this.calendarEvents = this.scheduledAppointments
      .map((appt) => {
        try {
          // Parse the ISO datetime string from the API
          const appointmentDate = new Date(appt.appointmentDateTime);

          if (isNaN(appointmentDate.getTime())) {
            console.warn(
              `Invalid date/time for appointment ID ${appt.id}: ${appt.appointmentDateTime}`
            );
            return null;
          }

          // End date is appointment time + duration (or default to 30 mins)
          const endDate = addHours(
            appointmentDate,
            (appt.durationMinutes || 30) / 60
          );

          // Set color based on appointment status
          let eventColor = { primary: '#1e90ff', secondary: '#D1E8FF' };
          if (appt.status === AppointmentStatus.COMPLETED) {
            eventColor = { primary: '#28a745', secondary: '#C8E6C9' };
          } else if (appt.status === AppointmentStatus.CANCELLED) {
            eventColor = { primary: '#dc3545', secondary: '#F8D7DA' };
          }

          // Create patient name from first and last name
          const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`;

          return {
            id: appt.id,
            title: `${patientName} (${appt.status})`,
            start: appointmentDate,
            end: endDate,
            color: eventColor,
            draggable: false,
            resizable: {
              beforeStart: false,
              afterEnd: false,
            },
            meta: {
              appointment: appt,
            },
          };
        } catch (e) {
          console.error(
            `Error processing appointment ID ${appt.id} for calendar:`,
            e
          );
          return null;
        }
      })
      .filter((event) => event !== null) as CustomCalendarEvent[];
  }

  onViewDateChanged(newDate: Date): void {
    this.viewDate = newDate;
    this.activeDayIsOpen = false;
  }

  onViewChanged(newView: CalendarView): void {
    this.view = newView;
    this.activeDayIsOpen = false;
  }

  onDayClicked({
    date,
    events,
  }: {
    date: Date;
    events: CustomCalendarEvent[];
  }): void {
    if (this.view === CalendarView.Month) {
      if (events.length > 0) {
        if (this.activeDayIsOpen && isSameDay(this.viewDate, date)) {
          this.activeDayIsOpen = false;
        } else {
          this.activeDayIsOpen = true;
          this.viewDate = date;
        }
      } else {
        this.activeDayIsOpen = false;
      }
    }
  }

  onHourSegmentClicked(event: { date: Date }): void {
    console.log('Hour segment clicked in doctor appointments', event.date);
    this.viewDate = event.date;
    this.view = CalendarView.Day;
    this.activeDayIsOpen = false;
  }

  handleEvent(action: string, event: CustomCalendarEvent): void {
    console.log('Event action:', action, 'Event:', event);
    const appt = event.meta.appointment;
    if (appt) {
      // Could show appointment details in a modal here
      alert(`
        Patient: ${appt.patient.firstName} ${appt.patient.lastName}
        Date: ${format(new Date(appt.appointmentDateTime), 'PPP')}
        Time: ${format(new Date(appt.appointmentDateTime), 'p')}
        Reason: ${appt.reasonForVisit || 'Not specified'}
        Status: ${appt.status}
      `);
    }
  }

  confirmAppointment(appointmentId: string): void {
    this.updatingAppointmentId = appointmentId;

    this.appointmentService
      .updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED)
      .pipe(finalize(() => (this.updatingAppointmentId = null)))
      .subscribe({
        next: (updatedAppointment) => {
          console.log('Appointment confirmed:', updatedAppointment);
          // Find and update the appointment in our local array
          const index = this.scheduledAppointments.findIndex(
            (a) => a.id === appointmentId
          );
          if (index !== -1) {
            this.scheduledAppointments[index] = updatedAppointment;
          }
          this.loadCalendarEvents(); // Refresh calendar view
        },
        error: (error) => {
          console.error('Error confirming appointment:', error);
          this.error = 'Failed to confirm appointment. Please try again.';
        },
      });
  }

  cancelAppointment(appointmentId: string): void {
    this.updatingAppointmentId = appointmentId;

    this.appointmentService
      .updateAppointmentStatus(appointmentId, AppointmentStatus.CANCELLED)
      .pipe(finalize(() => (this.updatingAppointmentId = null)))
      .subscribe({
        next: (updatedAppointment) => {
          console.log('Appointment cancelled:', updatedAppointment);
          // Find and update the appointment in our local array
          const index = this.scheduledAppointments.findIndex(
            (a) => a.id === appointmentId
          );
          if (index !== -1) {
            this.scheduledAppointments[index] = updatedAppointment;
          }
          this.loadCalendarEvents(); // Refresh calendar view
        },
        error: (error) => {
          console.error('Error cancelling appointment:', error);
          this.error = 'Failed to cancel appointment. Please try again.';
        },
      });
  }

  markAsCompleted(appointmentId: string): void {
    this.updatingAppointmentId = appointmentId;

    this.appointmentService
      .updateAppointmentStatus(appointmentId, AppointmentStatus.COMPLETED)
      .pipe(finalize(() => (this.updatingAppointmentId = null)))
      .subscribe({
        next: (updatedAppointment) => {
          console.log('Appointment completed:', updatedAppointment);
          // Find and update the appointment in our local array
          const index = this.scheduledAppointments.findIndex(
            (a) => a.id === appointmentId
          );
          if (index !== -1) {
            this.scheduledAppointments[index] = updatedAppointment;
          }
          this.loadCalendarEvents(); // Refresh calendar view
        },
        error: (error) => {
          console.error('Error completing appointment:', error);
          this.error =
            'Failed to mark appointment as completed. Please try again.';
        },
      });
  }

  // Helper method to format date for display
  formatDate(dateString: string): string {
    return format(new Date(dateString), 'PPP');
  }

  // Helper method to format time for display
  formatTime(dateString: string): string {
    return format(new Date(dateString), 'p');
  }

  // Helper method to get patient full name
  getPatientName(patient: { firstName: string; lastName: string }): string {
    return `${patient.firstName} ${patient.lastName}`;
  }
}
