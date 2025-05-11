import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CalendarView } from 'angular-calendar';
import { parse, addHours, startOfDay, endOfDay, isSameDay } from 'date-fns';
import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../../shared/calendar-view/calendar-view.component';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Cancelled' | 'Completed';
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, RouterLink, CalendarViewComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
})
export class AppointmentsComponent implements OnInit {
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];

  // Calendar properties
  view: CalendarView = CalendarView.Month;
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  activeDayIsOpen: boolean = false;
  CalendarView = CalendarView; // Make enum available in template

  // Add the missing onHourSegmentClicked method
  onHourSegmentClicked(event: { date: Date }): void {
    console.log('Hour segment clicked in patient appointments', event.date);
    // Implement actual logic if needed
    this.viewDate = event.date;
    this.view = CalendarView.Day;
    this.activeDayIsOpen = false;
  }

  constructor() {}

  ngOnInit(): void {
    // Dummy data - replace with actual service call
    this.upcomingAppointments = [
      {
        id: 'appt1',
        doctorName: 'Dr. Alice Smith',
        specialty: 'Cardiology',
        date: '2025-05-15',
        time: '10:00 AM',
        status: 'Confirmed',
      },
      {
        id: 'appt2',
        doctorName: 'Dr. Bob Johnson',
        specialty: 'Neurology',
        date: '2025-06-02',
        time: '02:30 PM',
        status: 'Confirmed',
      },
    ];
    this.pastAppointments = [
      {
        id: 'appt3',
        doctorName: 'Dr. Carol Williams',
        specialty: 'Pediatrics',
        date: '2025-04-20',
        time: '11:00 AM',
        status: 'Completed',
      },
      {
        id: 'appt4',
        doctorName: 'Dr. Alice Smith',
        specialty: 'Cardiology',
        date: '2025-03-10',
        time: '09:00 AM',
        status: 'Cancelled',
      },
    ];
    this.loadCalendarEvents();
  }

  loadCalendarEvents(): void {
    const allAppointments = [
      ...this.upcomingAppointments,
      ...this.pastAppointments,
    ];
    this.calendarEvents = allAppointments
      .map((appt) => {
        try {
          const dateTimeString = `${appt.date} ${appt.time}`;
          const startDate = parse(
            dateTimeString,
            'yyyy-MM-dd h:mm a',
            new Date()
          );

          if (isNaN(startDate.getTime())) {
            console.warn(
              `Invalid date/time for appointment ID ${appt.id}: ${dateTimeString}`
            );
            const fallbackDate = parse(appt.date, 'yyyy-MM-dd', new Date());
            return {
              title: `INVALID TIME - Dr. ${appt.doctorName} (${appt.status})`,
              start: startOfDay(fallbackDate),
              end: endOfDay(fallbackDate),
              color: { primary: '#FF0000', secondary: '#FFCCCC' },
              meta: { appointmentId: appt.id, originalAppointment: appt },
            };
          }

          const endDate = addHours(startDate, 1); // Assuming 1-hour appointments

          let eventColor = { primary: '#1e90ff', secondary: '#D1E8FF' }; // Default blue for Confirmed
          if (appt.status === 'Completed') {
            eventColor = { primary: '#28a745', secondary: '#C8E6C9' }; // Green
          } else if (appt.status === 'Cancelled') {
            eventColor = { primary: '#dc3545', secondary: '#F8D7DA' }; // Red
          }

          return {
            title: `Dr. ${appt.doctorName} (${appt.specialty}) - ${appt.status}`,
            start: startDate,
            end: endDate,
            color: eventColor,
            meta: { appointmentId: appt.id, originalAppointment: appt },
          };
        } catch (e) {
          console.error(
            `Error processing patient appointment ID ${appt.id} for calendar: `,
            appt,
            e
          );
          const fallbackDate = parse(appt.date, 'yyyy-MM-dd', new Date());
          return {
            title: `ERROR - Dr. ${appt.doctorName}`,
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

  handleEvent(action: string, event: CustomCalendarEvent): void {
    console.log('Patient event action:', action, 'Event:', event);
    const originalAppt = event.meta.originalAppointment as Appointment;
    if (originalAppt) {
      alert(
        `Appointment with: Dr. ${originalAppt.doctorName}\nSpecialty: ${originalAppt.specialty}\nDate: ${originalAppt.date}\nTime: ${originalAppt.time}\nStatus: ${originalAppt.status}`
      );
    }
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancelling appointment by patient:', appointmentId);
    const appointment = this.upcomingAppointments.find(
      (appt) => appt.id === appointmentId
    );
    if (appointment) {
      appointment.status = 'Cancelled'; // Mark as cancelled
    }
    this.upcomingAppointments = this.upcomingAppointments.filter(
      (appt) => appt.id !== appointmentId
    );
    this.loadCalendarEvents(); // Refresh calendar
    alert('Appointment cancelled (Dummy)');
  }
}
