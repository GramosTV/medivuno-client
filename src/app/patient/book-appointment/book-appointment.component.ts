import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss']
})
export class BookAppointmentComponent implements OnInit {
  bookingForm: FormGroup;
  doctors: Doctor[] = [
    { id: 'doc1', name: 'Dr. Alice Smith', specialty: 'Cardiology' },
    { id: 'doc2', name: 'Dr. Bob Johnson', specialty: 'Neurology' },
    { id: 'doc3', name: 'Dr. Carol Williams', specialty: 'Pediatrics' }
  ];
  availableTimeSlots: TimeSlot[] = [];
  minDate: string;

  constructor(private fb: FormBuilder, private router: Router) {
    this.bookingForm = this.fb.group({
      doctor: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required]
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.bookingForm.get('date')?.valueChanges.subscribe(value => {
      this.updateAvailableTimeSlots(value);
    });
  }

  updateAvailableTimeSlots(selectedDate: string): void {
    // Dummy time slots - in a real app, fetch this based on doctor and date
    console.log(`Fetching time slots for ${selectedDate} and doctor ${this.bookingForm.get('doctor')?.value}`);
    this.availableTimeSlots = [
      { time: '09:00 AM', available: true },
      { time: '10:00 AM', available: false }, // Example of a booked slot
      { time: '11:00 AM', available: true },
      { time: '01:00 PM', available: true },
      { time: '02:00 PM', available: true },
    ];
    this.bookingForm.get('time')?.setValue(''); // Reset time selection
  }

  onSubmit(): void {
    if (this.bookingForm.valid) {
      console.log('Booking submitted:', this.bookingForm.value);
      // Here you would typically call a service to save the appointment
      alert('Appointment booked successfully! (Dummy)');
      this.router.navigate(['/patient/appointments']);
    } else {
      console.log('Form is invalid');
    }
  }
}
