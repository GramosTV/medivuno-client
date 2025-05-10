import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Appointment {
  id: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string; // Optional: a brief reason for the visit
  status: 'Confirmed' | 'Completed' | 'Cancelled';
}

@Component({
  selector: 'app-doctor-appointments', // Changed selector to avoid conflict if it's used in the same parent as patient's appointments
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
  scheduledAppointments: Appointment[] = [];

  constructor() { }

  ngOnInit(): void {
    // Dummy data - replace with actual service call to fetch doctor's appointments
    this.scheduledAppointments = [
      {
        id: 'd_appt1',
        patientName: 'John Doe',
        appointmentDate: '2025-05-15',
        appointmentTime: '10:00 AM',
        reason: 'Routine check-up',
        status: 'Confirmed'
      },
      {
        id: 'd_appt2',
        patientName: 'Jane Smith',
        appointmentDate: '2025-05-15',
        appointmentTime: '11:30 AM',
        reason: 'Follow-up consultation',
        status: 'Confirmed'
      },
      {
        id: 'd_appt3',
        patientName: 'Michael Brown',
        appointmentDate: '2025-05-16',
        appointmentTime: '09:00 AM',
        reason: 'Flu symptoms',
        status: 'Confirmed'
      },
      {
        id: 'd_appt4',
        patientName: 'Emily White',
        appointmentDate: '2025-04-28',
        appointmentTime: '02:00 PM',
        reason: 'Annual physical',
        status: 'Completed'
      }
    ];
  }

  // Optional: Methods to confirm, cancel, or mark appointments as complete
  confirmAppointment(appointmentId: string): void {
    console.log('Confirming appointment:', appointmentId);
    // Logic to update appointment status
    const appt = this.scheduledAppointments.find(a => a.id === appointmentId);
    if (appt) appt.status = 'Confirmed';
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancelling appointment by doctor:', appointmentId);
    const appt = this.scheduledAppointments.find(a => a.id === appointmentId);
    if (appt) appt.status = 'Cancelled';
    // Potentially remove or filter out, or send notification
  }

  markAsCompleted(appointmentId: string): void {
    console.log('Marking appointment as completed:', appointmentId);
    const appt = this.scheduledAppointments.find(a => a.id === appointmentId);
    if (appt) appt.status = 'Completed';
  }

}
