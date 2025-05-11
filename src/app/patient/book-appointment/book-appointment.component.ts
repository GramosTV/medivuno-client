import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  CustomCalendarEvent,
  CalendarViewComponent,
} from '../../shared/calendar-view/calendar-view.component';
import { CalendarView } from 'angular-calendar';

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
  imports: [CommonModule, ReactiveFormsModule, CalendarViewComponent],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.scss'],
})
export class BookAppointmentComponent implements OnInit {
  bookingForm: FormGroup;
  doctors: Doctor[] = [
    { id: 'doc1', name: 'Dr. Alice Smith', specialty: 'Cardiology' },
    { id: 'doc2', name: 'Dr. Bob Johnson', specialty: 'Neurology' },
    { id: 'doc3', name: 'Dr. Carol Williams', specialty: 'Pediatrics' },
  ];
  availableTimeSlots: TimeSlot[] = [];
  minDate: string;

  // Calendar properties
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  activeDayIsOpen: boolean = false;
  CalendarView = CalendarView;

  constructor(private fb: FormBuilder, private router: Router) {
    this.bookingForm = this.fb.group({
      doctor: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.bookingForm.get('doctor')?.valueChanges.subscribe((doctorId) => {
      const dateString = this.bookingForm.get('date')?.value;
      if (dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        const selectedDateObject = new Date(year, month - 1, day);
        this.updateAvailableTimeSlots(selectedDateObject);
      } else {
        this.availableTimeSlots = [];
        this.bookingForm.get('time')?.setValue('');
      }
    });

    this.bookingForm.statusChanges.subscribe((status) => {
      console.log('Form status changed:', status);
      console.log(
        'Doctor status:',
        this.bookingForm.get('doctor')?.status,
        'Doctor value:',
        this.bookingForm.get('doctor')?.value
      );
      console.log(
        'Date status:',
        this.bookingForm.get('date')?.status,
        'Date value:',
        this.bookingForm.get('date')?.value
      );
      console.log(
        'Time status:',
        this.bookingForm.get('time')?.status,
        'Time value:',
        this.bookingForm.get('time')?.value
      );
      console.log('--------------------------');
    });
  }

  onDateSelected(event: { date: Date; events: CustomCalendarEvent[] }): void {
    const selectedDate = event.date;
    const formattedDate = selectedDate.toISOString().split('T')[0];
    console.log(
      `[BookAppointmentComponent] onDateSelected: Received date - ${selectedDate.toDateString()}, Formatted date for form - ${formattedDate}`
    );

    const dateControl = this.bookingForm.get('date');
    if (dateControl) {
      dateControl.setValue(formattedDate);
      console.log(
        `[BookAppointmentComponent] onDateSelected: date control value AFTER setValue: '${dateControl.value}'`
      );
      console.log(
        `[BookAppointmentComponent] onDateSelected: date control status AFTER setValue: ${dateControl.status}`
      );
      console.log(
        `[BookAppointmentComponent] onDateSelected: bookingForm.value.date directly from form group: '${this.bookingForm.value.date}'`
      );
    } else {
      console.error(
        '[BookAppointmentComponent] onDateSelected: date form control not found!'
      );
    }

    this.updateAvailableTimeSlots(selectedDate);
    this.activeDayIsOpen = false;
  }

  onTimeSlotSelected(event: { event: CustomCalendarEvent }): void {
    console.log(
      'Time slot selected from calendar event (should not be called now):',
      event.event
    );
    // This method might be removed or adapted if calendar event clicks are not used for time selection
    // For now, let's ensure it doesn't break if somehow called, but its primary trigger is removed.
    const selectedTime = event.event.start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    this.bookingForm.get('time')?.setValue(selectedTime);

    // Also update the availableTimeSlots dropdown to reflect this selection
    const selectedSlot = this.availableTimeSlots.find(
      (slot) => slot.time === selectedTime
    );
    if (selectedSlot && selectedSlot.available) {
      // Optionally, do something if the slot is available
    }
  }

  onHourSegmentClicked(event: { date: Date }): void {
    console.log('Hour segment clicked (should not be called now):', event.date);
    // This method is no longer directly triggered from the template for month-only view
    // If it were to be used, it would set the date and update slots.
    // For now, its direct trigger is removed.
    // this.viewDate = event.date;
    // this.bookingForm
    //   .get('date')
    //   ?.setValue(event.date.toISOString().split('T')[0]);
    // this.updateAvailableTimeSlots(event.date);
    // this.calendarEvents = [];
  }

  updateAvailableTimeSlots(selectedDate: Date): void {
    console.log(
      `Fetching time slots for ${selectedDate.toDateString()} and doctor ${
        this.bookingForm.get('doctor')?.value
      }`
    );
    const day = selectedDate.getDay();
    let timeSlots: TimeSlot[] = [];

    if (this.bookingForm.get('doctor')?.value) {
      if (
        this.bookingForm.get('doctor')?.value === 'doc1' &&
        (day === 0 || day === 6) // Sunday or Saturday
      ) {
        timeSlots = [];
      } else {
        timeSlots = [
          { time: '09:00 AM', available: true },
          { time: '10:00 AM', available: true },
          { time: '11:00 AM', available: true },
          { time: '01:00 PM', available: true },
          { time: '02:00 PM', available: true },
        ];
      }
    } else {
      timeSlots = [];
    }
    this.availableTimeSlots = timeSlots; // Populate for the dropdown
    this.bookingForm.get('time')?.setValue('');

    this.calendarEvents = []; // Clear calendar events when date changes
  }

  onSubmit(): void {
    if (this.bookingForm.valid) {
      console.log('Booking submitted:', this.bookingForm.value);
      alert('Appointment booked successfully! (Dummy)');
      this.router.navigate(['/patient/appointments']);
    } else {
      console.log('Form is invalid');
    }
  }
}
