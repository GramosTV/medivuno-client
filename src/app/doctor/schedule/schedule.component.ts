import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CalendarView } from 'angular-calendar';
import { addDays, setDay, startOfWeek, setHours, setMinutes } from 'date-fns';
import { Subscription } from 'rxjs';

import {
  CalendarViewComponent,
  CustomCalendarEvent,
} from '../../shared/calendar-view/calendar-view.component';
import { AppointmentNotificationService } from '../../shared/services/appointment-notification.service';

interface AvailabilitySlot {
  id: string; // Unique ID for the slot
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday'
  startTime: string; // e.g., '09:00'
  endTime: string; // e.g., '17:00'
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CalendarViewComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent implements OnInit, OnDestroy {
  availabilityForm: FormGroup;
  doctorSchedule: AvailabilitySlot[] = [];
  daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  timeOptions: string[] = [];
  notification: { message: string; type: string } | null = null;
  private subscriptions: Subscription[] = [];

  // Calendar properties
  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  calendarEvents: CustomCalendarEvent[] = [];
  CalendarView = CalendarView;

  constructor(
    private fb: FormBuilder,
    private appointmentNotificationService: AppointmentNotificationService
  ) {
    this.availabilityForm = this.fb.group(
      {
        dayOfWeek: ['', Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
      },
      { validators: this.timeSlotValidator }
    );
  }

  ngOnInit(): void {
    this.generateTimeOptions();
    this.doctorSchedule = [
      {
        id: 'slot1',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '12:00',
      },
      {
        id: 'slot2',
        dayOfWeek: 'Monday',
        startTime: '14:00',
        endTime: '17:00',
      },
      {
        id: 'slot3',
        dayOfWeek: 'Wednesday',
        startTime: '10:00',
        endTime: '16:00',
      },
      {
        id: 'slot4',
        dayOfWeek: 'Friday',
        startTime: '09:00',
        endTime: '13:00',
      },
    ];
    this.loadCalendarEvents();

    // Subscribe to real-time appointment notifications
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

            // Clear notification after a delay
            setTimeout(() => {
              this.notification = null;
            }, 5000);
          }
        }
      );

    this.subscriptions.push(notificationSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  generateTimeOptions() {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        // 30-minute intervals
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
      return { invalidTimeRange: true };
    }
    return null;
  }

  loadCalendarEvents(): void {
    this.calendarEvents = [];
    // Corrected: Cast number to Day (0-6)
    const weekStartsOn = this.daysOfWeek.indexOf('Sunday') as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
    const startOfCurrentViewWeek = startOfWeek(this.viewDate, { weekStartsOn });

    this.doctorSchedule.forEach((slot) => {
      const dayIndex = this.daysOfWeek.indexOf(slot.dayOfWeek);
      if (dayIndex === -1) return;

      const targetDate = addDays(startOfCurrentViewWeek, dayIndex);

      try {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        const startDate = setMinutes(
          setHours(targetDate, startHour),
          startMinute
        );
        const endDate = setMinutes(setHours(targetDate, endHour), endMinute);

        if (startDate < endDate) {
          this.calendarEvents.push({
            title: `Available: ${slot.startTime} - ${slot.endTime}`,
            start: startDate,
            end: endDate,
            color: { primary: '#1e90ff', secondary: '#D1E8FF' },
            draggable: false,
            resizable: { beforeStart: false, afterEnd: false },
            meta: { slotId: slot.id },
          });
        } else {
          console.warn(
            `Invalid time range for slot ID ${slot.id}: ${slot.startTime} - ${slot.endTime}`
          );
        }
      } catch (e) {
        console.error(`Error parsing time for slot ID ${slot.id}`, e);
      }
    });
  }

  onViewDateChanged(newDate: Date): void {
    this.viewDate = newDate;
    this.loadCalendarEvents();
  }

  onViewChanged(newView: CalendarView): void {
    this.view = newView;
    this.loadCalendarEvents();
  }

  addAvailability(): void {
    if (this.availabilityForm.invalid) {
      this.availabilityForm.markAllAsTouched();
      return;
    }

    const newSlot: AvailabilitySlot = {
      id: `slot${new Date().getTime()}`,
      ...this.availabilityForm.value,
    };

    const conflict = this.doctorSchedule.find(
      (slot) =>
        slot.dayOfWeek === newSlot.dayOfWeek &&
        Math.max(
          parseInt(slot.startTime.replace(':', '')),
          parseInt(newSlot.startTime.replace(':', ''))
        ) <
          Math.min(
            parseInt(slot.endTime.replace(':', '')),
            parseInt(newSlot.endTime.replace(':', ''))
          )
    );

    if (conflict) {
      alert('This time slot conflicts with an existing one.');
      return;
    }

    this.doctorSchedule.push(newSlot);
    this.doctorSchedule.sort((a, b) => {
      const dayCompare =
        this.daysOfWeek.indexOf(a.dayOfWeek) -
        this.daysOfWeek.indexOf(b.dayOfWeek);
      if (dayCompare !== 0) return dayCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    this.availabilityForm.reset({ dayOfWeek: '', startTime: '', endTime: '' });
    this.loadCalendarEvents();
  }

  removeAvailability(slotId: string): void {
    this.doctorSchedule = this.doctorSchedule.filter(
      (slot) => slot.id !== slotId
    );
    console.log('Removed availability slot:', slotId);
    this.loadCalendarEvents();
  }
}
