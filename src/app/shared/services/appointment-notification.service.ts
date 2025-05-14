import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription, of } from 'rxjs';
import { switchMap, takeUntil, filter, catchError, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { Appointment, AppointmentService } from './appointment.service';
import { AuthService } from '../../core/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AppointmentNotification {
  appointmentId: string;
  type: 'created' | 'updated' | 'cancelled' | 'reminder';
  appointment: Appointment;
}

// API response structure
interface ApiResponse<T> {
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentNotificationService implements OnDestroy {
  private appointmentNotificationsSubject =
    new BehaviorSubject<AppointmentNotification | null>(null);

  // Observable that components can subscribe to
  public appointmentNotifications$ =
    this.appointmentNotificationsSubject.asObservable();

  // For tracking the last poll time
  private lastPollTime: Date = new Date();
  private pollingSubscription: Subscription | null = null;
  private destroy$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService,
    private appointmentService: AppointmentService
  ) {
    // Start polling for appointment updates
    this.startPolling();
  }

  /**
   * Start polling for appointment changes
   * @param intervalMs Polling interval in milliseconds (default: 30000 - 30 seconds)
   */
  public startPolling(intervalMs = 30000): void {
    // Stop any existing polling
    this.stopPolling();

    console.log('Starting appointment notification polling');

    this.pollingSubscription = interval(intervalMs)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.authService.isAuthenticated()),
        switchMap(() => this.checkForAppointmentUpdates()),
        catchError((err) => {
          console.error('Error polling for appointment updates:', err);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Stop polling for appointment updates
   */
  public stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Check for appointment updates since last poll
   */
  private checkForAppointmentUpdates(): Observable<any> {
    const apiUrl = `${environment.apiUrl}/api/v1/appointments/updates`;
    const params = { since: this.lastPollTime.toISOString() };

    // Update the poll time
    this.lastPollTime = new Date();

    return this.appointmentService.getAppointmentsForUser().pipe(
      tap((appointments) => {
        // Compare with local cache to determine which ones are new or updated
        // This is a simplified version - in production you'd want to have
        // a more sophisticated mechanism on the backend to track changes

        // For now, just notify about recent appointments (last 24 hours)
        const recentAppointments = appointments.filter((a) => {
          const createdAt = new Date(a.createdAt);
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          return createdAt >= oneDayAgo;
        });

        // Create notifications for recent appointments
        recentAppointments.forEach((appointment) => {
          this.notificationService.addNotification({
            type: 'appointment',
            title: 'Recent Appointment',
            content: this.getNotificationMessage(appointment, 'created'),
            route: this.getCurrentUserRoute('/appointments'),
            metadata: { appointmentId: appointment.id },
          });

          this.appointmentNotificationsSubject.next({
            appointmentId: appointment.id,
            type: 'created',
            appointment: appointment,
          });
        });
      }),
      catchError((err) => {
        console.error('Error checking for appointment updates:', err);
        return of([]);
      })
    );
  }

  private getCurrentUserRoute(path: string): string {
    const currentUserRole = this.authService.getCurrentUserRole();
    if (currentUserRole === 'admin' || currentUserRole === 'doctor') {
      return `/doctor${path}`;
    } else {
      return `/patient${path}`;
    }
  }

  /**
   * Helper method to determine if the current user is a doctor
   */
  private isCurrentUserDoctor(): boolean {
    const role = this.authService.getCurrentUserRole();
    return role === 'doctor' || role === 'admin';
  }

  /**
   * Generate appropriate message for appointment notifications
   * @param appointment The appointment object or appointment notification object
   * @param type Optional type parameter. If not provided, it will be inferred from the appointment object
   */
  public getNotificationMessage(appointment: any, type?: string): string {
    const date = new Date(appointment.appointmentDateTime).toLocaleString();
    const patientName = appointment.patientName || 'patient';
    const doctorName = appointment.doctorName || 'doctor';

    const withPerson = this.isCurrentUserDoctor()
      ? `with ${patientName}`
      : `with Dr. ${doctorName}`;

    // If type is not provided, try to infer it from the appointment object
    const notificationType = type || appointment.type || 'default';

    switch (notificationType) {
      case 'created':
        return `New appointment ${withPerson} scheduled for ${date}`;
      case 'updated':
        return `Your appointment ${withPerson} has been rescheduled to ${date}`;
      case 'cancelled':
        return `Your appointment ${withPerson} for ${date} has been cancelled`;
      case 'reminder':
        return `Reminder: You have an appointment ${withPerson} on ${date}`;
      case 'default':
      default:
        return `Appointment ${withPerson} on ${date}`;
    }
  }

  /**
   * Get appropriate color class based on notification type
   */
  public getNotificationColorClass(
    notification: AppointmentNotification
  ): string {
    switch (notification.type) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  ngOnDestroy(): void {
    // Signal components to stop observables
    this.destroy$.next(true);
    this.destroy$.complete();
    this.stopPolling();
  }
}
