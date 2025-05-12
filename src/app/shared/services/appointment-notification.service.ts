import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';
import { Appointment } from './appointment.service';
import { AuthService } from '../../core/auth.service';

interface AppointmentNotification {
  appointmentId: string;
  type: 'created' | 'updated' | 'cancelled' | 'reminder';
  appointment: Appointment;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentNotificationService {
  private appointmentNotificationsSubject =
    new BehaviorSubject<AppointmentNotification | null>(null);

  // Observable that components can subscribe to
  public appointmentNotifications$ =
    this.appointmentNotificationsSubject.asObservable();

  constructor(
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    // Setup WebSocket event listeners for appointment notifications
    this.setupWebSocketListeners();

    // Join appointment notification room when connected
    this.webSocketService.connected$.subscribe((connected) => {
      if (connected) {
        this.joinAppointmentRoom();
      }
    });
  }

  private setupWebSocketListeners(): void {
    // Handle new appointment notifications
    this.webSocketService.appointmentCreated$.subscribe((data) => {
      if (data && data.appointment) {
        // Add to the notification service
        this.notificationService.addNotification({
          type: 'appointment',
          title: 'New Appointment',
          content: this.getNotificationMessage(data.appointment, 'created'),
          route: this.getCurrentUserRoute('/appointments'),
          metadata: { appointmentId: data.appointmentId },
        });

        // Also update the subject for components listening directly
        this.appointmentNotificationsSubject.next({
          appointmentId: data.appointmentId,
          type: 'created',
          appointment: data.appointment,
        });
      }
    });

    // Handle appointment updates
    this.webSocketService.appointmentUpdated$.subscribe((data) => {
      if (data && data.appointment) {
        // Add to the notification service
        this.notificationService.addNotification({
          type: 'appointment',
          title: 'Appointment Updated',
          content: this.getNotificationMessage(data.appointment, 'updated'),
          route: this.getCurrentUserRoute('/appointments'),
          metadata: { appointmentId: data.appointmentId },
        });

        // Also update the subject for components listening directly
        this.appointmentNotificationsSubject.next({
          appointmentId: data.appointmentId,
          type: 'updated',
          appointment: data.appointment,
        });
      }
    });

    // Handle appointment cancellations
    this.webSocketService.appointmentCancelled$.subscribe((data) => {
      if (data && data.appointment) {
        // Add to the notification service
        this.notificationService.addNotification({
          type: 'appointment',
          title: 'Appointment Cancelled',
          content: this.getNotificationMessage(data.appointment, 'cancelled'),
          route: this.getCurrentUserRoute('/appointments'),
          metadata: { appointmentId: data.appointmentId },
        });

        // Also update the subject for components listening directly
        this.appointmentNotificationsSubject.next({
          appointmentId: data.appointmentId,
          type: 'cancelled',
          appointment: data.appointment,
        });
      }
    });

    // Handle appointment reminders
    this.webSocketService.appointmentReminder$.subscribe((data) => {
      if (data && data.appointment) {
        // Add to the notification service with high priority
        this.notificationService.addNotification({
          type: 'reminder',
          title: 'Appointment Reminder',
          content: this.getNotificationMessage(data.appointment, 'reminder'),
          route: this.getCurrentUserRoute('/appointments'),
          metadata: { appointmentId: data.appointmentId },
        });

        // Also update the subject for components listening directly
        this.appointmentNotificationsSubject.next({
          appointmentId: data.appointmentId,
          type: 'reminder',
          appointment: data.appointment,
        });
      }
    });
  }

  private joinAppointmentRoom(): void {
    const userProfile = this.authService.getProfileFromToken();
    if (userProfile && userProfile.id) {
      this.webSocketService.joinRoom(
        `appointment-${userProfile.id}`,
        (success) => {
          if (success) {
            console.log('Successfully joined appointment notification room');
          } else {
            console.error('Failed to join appointment notification room');
          }
        }
      );
    }
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

  private isCurrentUserDoctor(): boolean {
    const currentUserRole = this.authService.getCurrentUserRole();
    return currentUserRole === 'admin' || currentUserRole === 'doctor';
  }
}
