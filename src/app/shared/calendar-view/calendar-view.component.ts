import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CalendarModule, // Keep this simple import
  CalendarView,
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
} from 'angular-calendar';
import {
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  addHours,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
} from 'date-fns';

// Define a custom event color structure if needed, or use angular-calendar's default
interface CustomEventColor {
  primary: string;
  secondary: string;
}

// Extend CalendarEvent if you need more properties
export interface CustomCalendarEvent extends CalendarEvent {
  meta?: any; // For custom data
  description?: string;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    CalendarModule, // Just CalendarModule here
  ],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Recommended for performance
  encapsulation: ViewEncapsulation.None, // Allows global styles for calendar
})
export class CalendarViewComponent implements OnInit {
  @Input() view: CalendarView = CalendarView.Month;
  @Input() viewDate: Date = new Date(); // Default to current date
  @Input() events: CustomCalendarEvent[] = []; // Input for appointments, availability etc.
  @Input() activeDayIsOpen: boolean = false; // For month view, whether to show events for clicked day

  @Output() dayClicked = new EventEmitter<{
    date: Date;
    events: CustomCalendarEvent[];
  }>();
  @Output() eventClicked = new EventEmitter<{ event: CustomCalendarEvent }>();
  @Output() viewChanged = new EventEmitter<CalendarView>();
  @Output() viewDateChanged = new EventEmitter<Date>();

  CalendarView = CalendarView; // Make CalendarView enum available in template

  // Example actions for events (e.g., edit, delete)
  actions: CalendarEventAction[] = [
    {
      label: '<i class="fas fa-fw fa-pencil-alt"></i>', // Example using FontAwesome
      a11yLabel: 'Edit',
      onClick: ({ event }: { event: CustomCalendarEvent }): void => {
        console.log('Edit event', event);
        // this.handleEvent('Edited', event);
      },
    },
    {
      label: '<i class="fas fa-fw fa-trash-alt"></i>',
      a11yLabel: 'Delete',
      onClick: ({ event }: { event: CustomCalendarEvent }): void => {
        this.events = this.events.filter((iEvent) => iEvent !== event);
        console.log('Event deleted', event);
        // this.handleEvent('Deleted', event);
      },
    },
  ];

  constructor() {}

  ngOnInit(): void {
    // Example: Add a default event if none are provided
    // if (this.events.length === 0) {
    //   this.events = [
    //     {
    //       start: subDays(startOfDay(new Date()), 1),
    //       end: addDays(new Date(), 1),
    //       title: 'A 3 day event',
    //       color: { primary: '#ad2121', secondary: '#FAE3E3' },
    //       actions: this.actions,
    //       allDay: true,
    //       resizable: {
    //         beforeStart: true,
    //         afterEnd: true,
    //       },
    //       draggable: true,
    //     }
    //   ];
    // }
  }

  onDayClicked({
    date,
    events,
  }: {
    date: Date;
    events: CustomCalendarEvent[];
  }): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
      }
      this.viewDate = date;
    }
    this.dayClicked.emit({ date, events });
    this.viewDateChanged.emit(this.viewDate);
  }

  onEventClicked(action: string, event: CustomCalendarEvent): void {
    this.eventClicked.emit({ event });
  }

  onEventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    event.start = newStart;
    event.end = newEnd;
    // Handle event drag or resize
    console.log('Event times changed', event);
    // this.refresh.next(); // If using a Subject to refresh
  }

  setView(view: CalendarView) {
    this.view = view;
    this.viewChanged.emit(this.view);
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }

  getEventsForSelectedDay(): CustomCalendarEvent[] {
    if (!this.activeDayIsOpen || !this.viewDate) {
      return [];
    }
    return this.events.filter(
      (event) =>
        isSameDay(event.start, this.viewDate) ||
        (event.end && isSameDay(event.end, this.viewDate)) ||
        (event.start < this.viewDate && event.end && event.end > this.viewDate)
    );
  }

  // Helper for navigating dates
  previousDate(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = subDays(startOfMonth(this.viewDate), 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = subDays(startOfWeek(this.viewDate), 7);
    } else {
      // Day
      this.viewDate = subDays(this.viewDate, 1);
    }
    this.viewDateChanged.emit(this.viewDate);
  }

  nextDate(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = addDays(endOfMonth(this.viewDate), 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = addDays(endOfWeek(this.viewDate), 1);
    } else {
      // Day
      this.viewDate = addDays(this.viewDate, 1);
    }
    this.viewDateChanged.emit(this.viewDate);
  }

  today(): void {
    this.viewDate = new Date();
    this.viewDateChanged.emit(this.viewDate);
  }

  formatDate(date: Date, formatString: string): string {
    return format(date, formatString);
  }
}
