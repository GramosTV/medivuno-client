import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarView } from 'angular-calendar';
import { addHours, isSameDay } from 'date-fns';
import { Subscription } from 'rxjs';

import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../../shared/calendar-view/calendar-view.component';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../../shared/services/appointment.service';
import { AppointmentNotificationService } from '../../shared/services/appointment-notification.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, CalendarViewComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  scheduledAppointments: Appointment[] = [];
  loading = false;
  error: string | null = null;
  notification: { message: string; type: string } | null = null;
  private subscriptions: Subscription[] = [];

  // Calendar properties
  view: CalendarView = CalendarView.Month;
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  activeDayIsOpen: boolean = false;
  CalendarView = CalendarView;

  constructor(
    private appointmentService: AppointmentService,
    private appointmentNotificationService: AppointmentNotificationService
  ) {}
  ngOnInit(): void {
    this.loadAppointments();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  subscribeToRealTimeUpdates(): void {
    const notificationSub =
      this.appointmentNotificationService.appointmentNotifications$.subscribe(
        (notification) => {
          if (notification) {
            // Show notification
            this.notification = {
              message:
                this.appointmentNotificationService.getNotificationMessage(
                  notification
                ),
              type: notification.type,
            };

            // Update appointment list and calendar after a short delay
            setTimeout(() => {
              // Update the list based on the notification type
              if (notification.type === 'created') {
                // Add the new appointment to the list if it doesn't exist
                const exists = this.scheduledAppointments.some(
                  (appt) => appt.id === notification.appointment.id
                );
                if (!exists) {
                  this.scheduledAppointments = [
                    notification.appointment,
                    ...this.scheduledAppointments,
                  ];
                  this.loadCalendarEvents();
                }
              } else if (notification.type === 'updated') {
                // Update the existing appointment
                this.scheduledAppointments = this.scheduledAppointments.map(
                  (appt) =>
                    appt.id === notification.appointment.id
                      ? notification.appointment
                      : appt
                );
                this.loadCalendarEvents();
              } else if (notification.type === 'cancelled') {
                // Update status to cancelled
                this.scheduledAppointments = this.scheduledAppointments.map(
                  (appt) =>
                    appt.id === notification.appointment.id
                      ? { ...appt, status: AppointmentStatus.CANCELLED }
                      : appt
                );
                this.loadCalendarEvents();
              }

              // Clear notification after 5 seconds
              setTimeout(() => {
                this.notification = null;
              }, 5000);
            }, 500);
          }
        }
      );

    this.subscriptions.push(notificationSub);
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
          // Use the appointmentDateTime directly from the API
          const startDate = new Date(appt.appointmentDateTime);

          if (isNaN(startDate.getTime())) {
            console.warn(
              `Invalid date/time for appointment ID ${appt.id}: ${appt.appointmentDateTime}`
            );
            return {
              title: `INVALID TIME - ${appt.patient.firstName} ${appt.patient.lastName} (${appt.status})`,
              start: new Date(),
              end: new Date(),
              color: { primary: '#FF0000', secondary: '#FFCCCC' },
              meta: { appointmentId: appt.id, originalAppointment: appt },
            };
          }

          // Add the duration in minutes, or default to 1 hour
          const endDate = addHours(
            startDate,
            (appt.durationMinutes || 60) / 60
          );

          // Map status to colors
          let eventColor = { primary: '#1e90ff', secondary: '#D1E8FF' };
          if (appt.status === AppointmentStatus.COMPLETED) {
            eventColor = { primary: '#28a745', secondary: '#C8E6C9' };
          } else if (appt.status === AppointmentStatus.CANCELLED) {
            eventColor = { primary: '#dc3545', secondary: '#F8D7DA' };
          }

          const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`;
          const formattedStatus =
            appt.status.charAt(0) + appt.status.slice(1).toLowerCase();

          return {
            title: `${patientName} - ${
              appt.reasonForVisit || 'Appointment'
            } (${formattedStatus})`,
            start: startDate,
            end: endDate,
            color: eventColor,
            actions: [],
            draggable: false,
            resizable: { beforeStart: false, afterEnd: false },
            meta: { appointmentId: appt.id, originalAppointment: appt },
          };
        } catch (e) {
          console.error(
            `Error processing appointment ID ${appt.id} for calendar: `,
            appt,
            e
          );
          return {
            title: `ERROR - Processing appointment`,
            start: new Date(),
            end: addHours(new Date(), 1),
            color: { primary: '#FF0000', secondary: '#FFCCCC' },
            meta: { appointmentId: appt.id, originalAppointment: appt },
          };
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
    const originalAppt = event.meta.originalAppointment as Appointment;
    if (originalAppt) {
      const patientName = `${originalAppt.patient.firstName} ${originalAppt.patient.lastName}`;
      const appointmentDate = new Date(
        originalAppt.appointmentDateTime
      ).toLocaleDateString();
      const appointmentTime = new Date(
        originalAppt.appointmentDateTime
      ).toLocaleTimeString();
      const status = originalAppt.status;

      alert(
        `Patient: ${patientName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nStatus: ${status}`
      );
    }
  }

  confirmAppointment(appointmentId: string): void {
    console.log('Confirming appointment:', appointmentId);
    this.updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED);
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancelling appointment by doctor:', appointmentId);
    this.updateAppointmentStatus(appointmentId, AppointmentStatus.CANCELLED);
  }

  markAsCompleted(appointmentId: string): void {
    console.log('Marking appointment as completed:', appointmentId);
    this.updateAppointmentStatus(appointmentId, AppointmentStatus.COMPLETED);
  }

  private updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ): void {
    this.loading = true;

    this.appointmentService
      .updateAppointmentStatus(appointmentId, status)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (updatedAppointment) => {
          console.log('Appointment status updated:', updatedAppointment);
          // Update the local appointment in the array
          const index = this.scheduledAppointments.findIndex(
            (a) => a.id === appointmentId
          );
          if (index !== -1) {
            this.scheduledAppointments[index] = updatedAppointment;
          }
          // Refresh calendar events
          this.loadCalendarEvents();
        },
        error: (error) => {
          console.error('Error updating appointment status:', error);
          this.error = 'Failed to update appointment status. Please try again.';
        },
      });
  }
}
