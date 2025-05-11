import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CalendarModule,
  CalendarView,
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarMonthViewDay,
  CalendarMonthViewBeforeRenderEvent,
  CalendarWeekViewBeforeRenderEvent,
  CalendarDayViewBeforeRenderEvent,
} from 'angular-calendar';
import { WeekDay } from 'calendar-utils';

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

interface CustomEventColor {
  primary: string;
  secondary: string;
}

export interface CustomCalendarEvent extends CalendarEvent {
  meta?: any;
  description?: string;
  type?: 'available' | 'booked' | 'unavailable' | 'selected';
  cssClass?: string;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, CalendarModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CalendarViewComponent implements OnInit {
  @Input() view: CalendarView = CalendarView.Month;
  @Input() viewDate: Date = new Date();
  @Input() events: CustomCalendarEvent[] = [];
  @Input() activeDayIsOpen: boolean = false;

  selectedDay: Date | null = null;
  selectedTimeSlot: CustomCalendarEvent | null = null;
  selectedHourSegmentDate: Date | null = null;

  @Output() dayClickedOutput = new EventEmitter<{
    date: Date;
    events: CustomCalendarEvent[];
  }>();
  @Output() eventClickedOutput = new EventEmitter<{
    event: CustomCalendarEvent;
    sourceEvent?: MouseEvent | KeyboardEvent;
  }>();
  @Output() hourSegmentClickedOutput = new EventEmitter<{ date: Date }>();
  @Output() viewChanged = new EventEmitter<CalendarView>();
  @Output() viewDateChanged = new EventEmitter<Date>();

  CalendarView = CalendarView;

  actions: CalendarEventAction[] = [
    {
      label: '<i class="fas fa-fw fa-pencil-alt"></i>',
      a11yLabel: 'Edit',
      onClick: ({ event }: { event: CustomCalendarEvent }): void => {
        console.log('Edit event', event);
      },
    },
    {
      label: '<i class="fas fa-fw fa-trash-alt"></i>',
      a11yLabel: 'Delete',
      onClick: ({ event }: { event: CustomCalendarEvent }): void => {
        this.events = this.events.filter((iEvent) => iEvent !== event);
        console.log('Event deleted', event);
      },
    },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.processEvents();
    if (
      this.viewDate &&
      !this.selectedDay &&
      !this.selectedTimeSlot &&
      !this.selectedHourSegmentDate
    ) {
      this.selectedDay = startOfDay(this.viewDate);
    }
  }

  processEvents(): void {
    this.events = this.events.map((event) => {
      let cssClass = event.cssClass || '';
      cssClass = cssClass
        .replace(
          /cal-event-available|cal-event-booked|cal-event-unavailable|cal-event-selected/g,
          ''
        )
        .trim();

      if (event.type === 'available') {
        event.color = {
          ...event.color,
          primary: '#10B981',
          secondary: '#D1FAE5',
        };
        cssClass += ' cal-event-available';
      } else if (event.type === 'booked') {
        event.color = {
          ...event.color,
          primary: '#EF4444',
          secondary: '#FEE2E2',
        };
        cssClass += ' cal-event-booked';
      } else if (event.type === 'unavailable') {
        event.color = {
          ...event.color,
          primary: '#6B7280',
          secondary: '#E5E7EB',
        };
        cssClass += ' cal-event-unavailable';
      }
      event.cssClass = cssClass.trim();
      return event;
    });
    this.updateEventVisuals();
  }

  onCalendarMonthDayClicked({
    date,
    events,
  }: {
    date: Date;
    events: CustomCalendarEvent[];
  }): void {
    this.selectedDay = date;
    this.selectedTimeSlot = null;
    this.selectedHourSegmentDate = null;

    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
      }
    } else {
      this.viewDate = date;
      this.activeDayIsOpen = events.length > 0;
    }

    this.dayClickedOutput.emit({ date, events });
    if (
      !isSameMonth(this.selectedDay, this.viewDate) ||
      !isSameDay(this.selectedDay, this.viewDate)
    ) {
      this.viewDate = date;
      this.viewDateChanged.emit(this.viewDate);
    }

    this.updateEventVisuals();
    this.refreshCalendar();
  }

  onCalendarWeekDayHeaderClicked({ date }: { date: Date }): void {
    this.selectedDay = date;
    this.selectedTimeSlot = null;
    this.selectedHourSegmentDate = null;

    this.viewDate = date;

    this.dayClickedOutput.emit({ date, events: this.getEventsOnDate(date) });
    this.viewDateChanged.emit(this.viewDate);
    this.updateEventVisuals();
    this.refreshCalendar();
  }

  onCalendarHourSegmentClicked({ date }: { date: Date }): void {
    this.selectedDay = startOfDay(date);
    this.selectedHourSegmentDate = date;
    this.selectedTimeSlot = null;

    if (!isSameDay(this.viewDate, this.selectedDay)) {
      this.viewDate = this.selectedDay;
      this.viewDateChanged.emit(this.viewDate);
    }

    this.hourSegmentClickedOutput.emit({ date });
    this.updateEventVisuals();
    this.refreshCalendar();
  }

  onCalendarEventClicked({
    event,
    sourceEvent,
  }: {
    event: CustomCalendarEvent;
    sourceEvent: MouseEvent | KeyboardEvent;
  }): void {
    this.selectedTimeSlot = event;
    this.selectedDay = startOfDay(event.start);
    this.selectedHourSegmentDate = event.start;

    if (!isSameDay(this.viewDate, this.selectedDay)) {
      this.viewDate = this.selectedDay;
      this.viewDateChanged.emit(this.viewDate);
    }
    this.activeDayIsOpen = true;

    this.eventClickedOutput.emit({ event, sourceEvent });
    this.updateEventVisuals();
    this.refreshCalendar();
  }

  updateEventVisuals(): void {
    this.events = this.events.map((event) => {
      const baseClasses = (event.cssClass || '')
        .split(' ')
        .filter((c) => c.length > 0 && c !== 'cal-event-selected');

      let newClasses = [...baseClasses];

      if (this.selectedTimeSlot && event.id === this.selectedTimeSlot.id) {
        if (!newClasses.includes('cal-event-selected')) {
          newClasses.push('cal-event-selected');
        }
      }
      return { ...event, cssClass: newClasses.join(' ').trim() };
    });
  }

  private toggleCssClass(
    el: HTMLElement,
    className: string,
    add: boolean
  ): void {
    if (el) {
      if (add) {
        el.classList.add(className);
      } else {
        el.classList.remove(className);
      }
    }
  }

  beforeMonthViewRender(renderEvent: CalendarMonthViewBeforeRenderEvent): void {
    renderEvent.body.forEach((day: CalendarMonthViewDay) => {
      if (this.selectedDay && isSameDay(day.date, this.selectedDay)) {
        day.cssClass = (day.cssClass || '') + ' cal-day-selected';
      } else {
        day.cssClass = (day.cssClass || '')
          .replace(' cal-day-selected', '')
          .trim();
      }
    });
    this.refreshCalendar();
  }

  beforeWeekViewRender(renderEvent: CalendarWeekViewBeforeRenderEvent): void {
    renderEvent.header.forEach((day: WeekDay) => {
      if (this.selectedDay && isSameDay(day.date, this.selectedDay)) {
        day.cssClass = (day.cssClass || '') + ' cal-day-selected';
      } else {
        day.cssClass = (day.cssClass || '')
          .replace(' cal-day-selected', '')
          .trim();
      }
    });
    renderEvent.hourColumns.forEach((hourColumn) => {
      hourColumn.hours.forEach((hour) => {
        hour.segments.forEach((segment) => {
          if (
            this.selectedHourSegmentDate &&
            segment.date.getTime() === this.selectedHourSegmentDate.getTime()
          ) {
            segment.cssClass =
              (segment.cssClass || '') + ' cal-hour-segment-selected';
          } else {
            segment.cssClass = (segment.cssClass || '')
              .replace(' cal-hour-segment-selected', '')
              .trim();
          }
        });
      });
    });
    this.refreshCalendar();
  }

  beforeDayViewRender(renderEvent: CalendarDayViewBeforeRenderEvent): void {
    renderEvent.hourColumns.forEach((hourColumn) => {
      hourColumn.hours.forEach((hour) => {
        hour.segments.forEach((segment) => {
          if (
            this.selectedHourSegmentDate &&
            segment.date.getTime() === this.selectedHourSegmentDate.getTime()
          ) {
            segment.cssClass =
              (segment.cssClass || '') + ' cal-hour-segment-selected';
          } else {
            segment.cssClass = (segment.cssClass || '')
              .replace(' cal-hour-segment-selected', '')
              .trim();
          }
        });
      });
    });
    this.refreshCalendar();
  }

  refreshCalendar(): void {
    this.cdr.markForCheck();
  }

  getEventsOnDate(date: Date): CustomCalendarEvent[] {
    return this.events.filter((event) => isSameDay(event.start, date));
  }

  onEventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent<CustomCalendarEvent>): void {
    event.start = newStart;
    event.end = newEnd;
    this.processEvents();
    this.refreshCalendar();
    console.log('Event times changed', event);
  }

  setView(view: CalendarView) {
    this.view = view;
    this.selectedHourSegmentDate = null;
    if (this.view === CalendarView.Month) {
      this.activeDayIsOpen = false;
    }
    this.viewChanged.emit(this.view);
    this.refreshCalendar();
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
    this.refreshCalendar();
  }

  getEventsForSelectedDay(): CustomCalendarEvent[] {
    if (!this.activeDayIsOpen || !this.viewDate) {
      return [];
    }
    return this.events.filter((event) => isSameDay(event.start, this.viewDate));
  }

  previousDate(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = subDays(startOfMonth(this.viewDate), 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = subDays(
        startOfWeek(this.viewDate, { weekStartsOn: 1 }),
        7
      );
    } else {
      this.viewDate = subDays(this.viewDate, 1);
    }
    this.selectedDay = startOfDay(this.viewDate);
    this.selectedTimeSlot = null;
    this.selectedHourSegmentDate = null;
    this.viewDateChanged.emit(this.viewDate);
    this.processEvents();
    this.refreshCalendar();
  }

  nextDate(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = addDays(endOfMonth(this.viewDate), 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = addDays(endOfWeek(this.viewDate, { weekStartsOn: 1 }), 1);
    } else {
      this.viewDate = addDays(this.viewDate, 1);
    }
    this.selectedDay = startOfDay(this.viewDate);
    this.selectedTimeSlot = null;
    this.selectedHourSegmentDate = null;
    this.viewDateChanged.emit(this.viewDate);
    this.processEvents();
    this.refreshCalendar();
  }

  today(): void {
    this.viewDate = new Date();
    this.selectedDay = startOfDay(this.viewDate);
    this.selectedTimeSlot = null;
    this.selectedHourSegmentDate = null;
    this.viewDateChanged.emit(this.viewDate);
    this.processEvents();
    this.refreshCalendar();
  }

  formatDate(date: Date, formatString: string): string {
    return format(date, formatString);
  }

  isDayCurrentlySelected(dayDate: Date): boolean {
    return this.selectedDay ? isSameDay(dayDate, this.selectedDay) : false;
  }

  isEventCurrentlySelected(event: CustomCalendarEvent): boolean {
    return this.selectedTimeSlot
      ? event.id === this.selectedTimeSlot.id
      : false;
  }
}
