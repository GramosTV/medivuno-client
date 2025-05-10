import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];

  constructor() { }

  ngOnInit(): void {
    // Dummy data - replace with actual service call
    this.upcomingAppointments = [
      { id: 'appt1', doctorName: 'Dr. Alice Smith', specialty: 'Cardiology', date: '2025-05-15', time: '10:00 AM', status: 'Confirmed' },
      { id: 'appt2', doctorName: 'Dr. Bob Johnson', specialty: 'Neurology', date: '2025-06-02', time: '02:30 PM', status: 'Confirmed' },
    ];
    this.pastAppointments = [
      { id: 'appt3', doctorName: 'Dr. Carol Williams', specialty: 'Pediatrics', date: '2025-04-20', time: '11:00 AM', status: 'Completed' },
    ];
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancelling appointment:', appointmentId);
    // Add logic to call a service to cancel the appointment
    // For now, just remove it from the list or change status
    this.upcomingAppointments = this.upcomingAppointments.filter(appt => appt.id !== appointmentId);
    alert('Appointment cancelled (Dummy)');
  }
}
