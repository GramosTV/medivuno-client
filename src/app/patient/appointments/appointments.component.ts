import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CalendarView } from 'angular-calendar';
import { addHours, isSameDay } from 'date-fns';
import { finalize } from 'rxjs/operators';
import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../../shared/calendar-view/calendar-view.component';
import {
  AppointmentService,
  AppointmentStatus,
} from '../../shared/services/appointment.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, RouterLink, CalendarViewComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
})
export class AppointmentsComponent implements OnInit {
  upcomingAppointments: any[] = [];
  pastAppointments: any[] = [];
  loading = true;
  error: string | null = null;

  // Calendar properties
  view: CalendarView = CalendarView.Month;
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  activeDayIsOpen: boolean = false;
  CalendarView = CalendarView; // Make enum available in template

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loading = true; // Load all patient appointments and separate them into upcoming and past
    this.appointmentService
      .getPatientAppointments()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (appointments: any[]) => {
          const now = new Date();
          this.upcomingAppointments = appointments.filter((appt) => {
            const appointmentDate = new Date(appt.startTime);
            return appointmentDate >= now && appt.status !== 'cancelled';
          });

          this.pastAppointments = appointments.filter((appt) => {
            const appointmentDate = new Date(appt.startTime);
            return appointmentDate < now || appt.status === 'cancelled';
          });

          this.loadCalendarEvents();
        },
        error: (err: any) => {
          console.error('Error loading appointments', err);
          this.error =
            'Failed to load your appointments. Please try again later.';
        },
      });
  }

  loadCalendarEvents(): void {
    // Combine all appointments for the calendar view
    const allAppointments = [
      ...this.upcomingAppointments,
      ...this.pastAppointments,
    ];

    // Map the appointments to calendar events
    this.calendarEvents = allAppointments.map((appt) => {
      // Use the full date object from the formatted appointment
      const startDate = appt.fullDateTime;
      const endDate = addHours(startDate, 1); // Assume 1 hour appointments

      // Set colors based on appointment status
      let colors = {
        primary: '#1976d2', // Blue for confirmed
        secondary: '#d1e8ff',
      };
      if (appt.status === 'completed') {
        colors = {
          primary: '#4caf50', // Green for completed
          secondary: '#e8f5e9',
        };
      } else if (appt.status === 'Cancelled') {
        colors = {
          primary: '#f44336', // Red for cancelled
          secondary: '#ffebee',
        };
      }

      return {
        title: `Dr. ${appt.doctorName} (${appt.specialty}) - ${appt.status}`,
        start: startDate,
        end: endDate,
        color: colors,
        meta: {
          appointmentId: appt.id,
          originalAppointment: appt,
        },
      };
    });
  }

  onViewDateChanged(newDate: Date): void {
    this.viewDate = newDate;
    this.activeDayIsOpen = false;
  }

  onViewChanged(newView: CalendarView): void {
    this.view = newView;
    this.activeDayIsOpen = false;
  }

  onDayClicked(event: { date: Date; events: CustomCalendarEvent[] }): void {
    if (this.view === CalendarView.Month) {
      if (
        event.events.length > 0 &&
        (this.activeDayIsOpen && isSameDay(this.viewDate, event.date)) === false
      ) {
        this.activeDayIsOpen = true;
      } else {
        this.activeDayIsOpen = false;
      }
      this.viewDate = event.date;
    }
  }

  onHourSegmentClicked(event: { date: Date }): void {
    console.log('Hour segment clicked in patient appointments', event.date);
    this.viewDate = event.date;
    this.view = CalendarView.Day;
    this.activeDayIsOpen = false;
  }

  handleEvent(action: string, event: CustomCalendarEvent): void {
    console.log('Patient event action:', action, 'Event:', event);
    if (event.meta?.originalAppointment) {
      // Handle appointment event click
      // You could open a detail dialog or navigate to details page
    }
  }

  cancelAppointment(appointmentId: string): void {
    this.appointmentService.cancelAppointment(appointmentId).subscribe({
      next: () => {
        // Remove the cancelled appointment from upcoming list
        this.upcomingAppointments = this.upcomingAppointments.filter(
          (appt) => appt.id !== appointmentId
        );

        // Reload the appointments to update the lists and calendar
        this.ngOnInit();
      },
      error: (err) => {
        console.error('Error cancelling appointment:', err);
        alert('Failed to cancel appointment. Please try again.');
      },
    });
  }
}
