import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarView } from 'angular-calendar';
import {
  parse,
  startOfDay,
  endOfDay,
  addHours,
  isSameDay,
  format,
} from 'date-fns';

import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../../shared/calendar-view/calendar-view.component';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../../shared/services/appointment.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, CalendarViewComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
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

  constructor(private appointmentService: AppointmentService) {}
  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = null;
    
    this.appointmentService.getDoctorAppointments()
      .subscribe({
        next: (appointments) => {
          console.log('Doctor appointments loaded:', appointments);
          this.scheduledAppointments = appointments;
          this.loadCalendarEvents();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading doctor appointments:', error);
          this.error = 'Failed to load appointments. Please try again.';
          this.loading = false;
        }
      });
  }
        status: 'Confirmed',
      },
      {
        id: 'd_appt2',
        patientName: 'Jane Smith',
        appointmentDate: '2025-05-15',
        appointmentTime: '11:30 AM',
        reason: 'Follow-up consultation',
        status: 'Confirmed',
      },
      {
        id: 'd_appt3',
        patientName: 'Michael Brown',
        appointmentDate: '2025-05-16',
        appointmentTime: '09:00 AM',
        reason: 'Flu symptoms',
        status: 'Confirmed',
      },
      {
        id: 'd_appt4',
        patientName: 'Emily White',
        appointmentDate: '2025-04-28',
        appointmentTime: '02:00 PM',
        reason: 'Annual physical',
        status: 'Completed',
      },
      {
        id: 'd_appt5',
        patientName: 'David Lee',
        appointmentDate: '2025-05-20',
        appointmentTime: '03:00 PM',
        reason: 'Pre-surgery check',
        status: 'Cancelled',
      },
    ];
    this.loadCalendarEvents();
  }

  loadCalendarEvents(): void {
    this.calendarEvents = this.scheduledAppointments
      .map((appt) => {
        try {
          const dateTimeString = `${appt.appointmentDate} ${appt.appointmentTime}`;
          const startDate = parse(
            dateTimeString,
            'yyyy-MM-dd h:mm a',
            new Date()
          );

          if (isNaN(startDate.getTime())) {
            console.warn(
              `Invalid date/time for appointment ID ${appt.id}: ${dateTimeString}`
            );
            const fallbackDate = parse(
              appt.appointmentDate,
              'yyyy-MM-dd',
              new Date()
            );
            return {
              title: `INVALID TIME - ${appt.patientName} (${appt.status})`,
              start: startOfDay(fallbackDate),
              end: endOfDay(fallbackDate),
              color: { primary: '#FF0000', secondary: '#FFCCCC' },
              meta: { appointmentId: appt.id, originalAppointment: appt },
            };
          }

          const endDate = addHours(startDate, 1);

          let eventColor = { primary: '#1e90ff', secondary: '#D1E8FF' };
          if (appt.status === 'Completed') {
            eventColor = { primary: '#28a745', secondary: '#C8E6C9' };
          } else if (appt.status === 'Cancelled') {
            eventColor = { primary: '#dc3545', secondary: '#F8D7DA' };
          }

          return {
            title: `${appt.patientName} - ${appt.reason} (${appt.status})`,
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
          const fallbackDate = parse(
            appt.appointmentDate,
            'yyyy-MM-dd',
            new Date()
          );
          return {
            title: `ERROR - ${appt.patientName}`,
            start: startOfDay(fallbackDate),
            end: endOfDay(fallbackDate),
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
      alert(
        `Patient: ${originalAppt.patientName}\nDate: ${originalAppt.appointmentDate}\nTime: ${originalAppt.appointmentTime}\nStatus: ${originalAppt.status}`
      );
    }
  }

  confirmAppointment(appointmentId: string): void {
    console.log('Confirming appointment:', appointmentId);
    const appt = this.scheduledAppointments.find((a) => a.id === appointmentId);
    if (appt) {
      appt.status = 'Confirmed';
      this.loadCalendarEvents();
    }
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancelling appointment by doctor:', appointmentId);
    const appt = this.scheduledAppointments.find((a) => a.id === appointmentId);
    if (appt) {
      appt.status = 'Cancelled';
      this.loadCalendarEvents();
    }
  }

  markAsCompleted(appointmentId: string): void {
    console.log('Marking appointment as completed:', appointmentId);
    const appt = this.scheduledAppointments.find((a) => a.id === appointmentId);
    if (appt) {
      appt.status = 'Completed';
      this.loadCalendarEvents();
    }
  }
}
