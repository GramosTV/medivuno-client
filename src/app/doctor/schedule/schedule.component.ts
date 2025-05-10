import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface AvailabilitySlot {
  id: string; // Unique ID for the slot
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday'
  startTime: string; // e.g., '09:00'
  endTime: string;   // e.g., '17:00'
}

@Component({
  selector: 'app-doctor-schedule', // Changed selector
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss']
})
export class ScheduleComponent implements OnInit {
  availabilityForm: FormGroup;
  doctorSchedule: AvailabilitySlot[] = [];
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Dummy time options for simplicity. In a real app, this might be more dynamic or use time pickers.
  timeOptions: string[] = [];

  constructor(private fb: FormBuilder) {
    this.availabilityForm = this.fb.group({
      dayOfWeek: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required]
    }, { validators: this.timeSlotValidator });
  }

  ngOnInit(): void {
    this.generateTimeOptions();
    // Load existing schedule (dummy data)
    this.doctorSchedule = [
      { id: 'slot1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00' },
      { id: 'slot2', dayOfWeek: 'Monday', startTime: '14:00', endTime: '17:00' },
      { id: 'slot3', dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '16:00' },
      { id: 'slot4', dayOfWeek: 'Friday', startTime: '09:00', endTime: '13:00' },
    ];
  }

  generateTimeOptions() {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) { // 30-minute intervals
        const hour = h < 10 ? '0' + h : h.toString();
        const minute = m < 10 ? '0' + m : m.toString();
        this.timeOptions.push(`${hour}:${minute}`);
      }
    }
  }

  timeSlotValidator(group: FormGroup): { [key: string]: boolean } | null {
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;
    if (startTime && endTime && startTime >= endTime) {
      return { 'invalidTimeRange': true };
    }
    return null;
  }

  addAvailability(): void {
    if (this.availabilityForm.invalid) {
      this.availabilityForm.markAllAsTouched();
      return;
    }

    const newSlot: AvailabilitySlot = {
      id: `slot${new Date().getTime()}`,
      ...this.availabilityForm.value
    };

    // Basic conflict check (can be more sophisticated)
    const conflict = this.doctorSchedule.find(slot =>
      slot.dayOfWeek === newSlot.dayOfWeek &&
      Math.max(parseInt(slot.startTime.replace(':', '')), parseInt(newSlot.startTime.replace(':', ''))) <
      Math.min(parseInt(slot.endTime.replace(':', '')), parseInt(newSlot.endTime.replace(':', '')))
    );

    if (conflict) {
      alert('This time slot conflicts with an existing one.');
      return;
    }

    this.doctorSchedule.push(newSlot);
    this.doctorSchedule.sort((a, b) => {
      const dayCompare = this.daysOfWeek.indexOf(a.dayOfWeek) - this.daysOfWeek.indexOf(b.dayOfWeek);
      if (dayCompare !== 0) return dayCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    this.availabilityForm.reset({ dayOfWeek: '', startTime: '', endTime: '' });
  }

  removeAvailability(slotId: string): void {
    this.doctorSchedule = this.doctorSchedule.filter(slot => slot.id !== slotId);
    // In a real app, call a service to update backend
    console.log('Removed availability slot:', slotId);
  }
}
