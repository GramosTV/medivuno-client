import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../../shared/services/appointment.service';
import { AppointmentNotificationService } from '../../shared/services/appointment-notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  upcomingAppointments: Appointment[] = [];
  recentNotifications: any[] = [];
  loading = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private appointmentService: AppointmentService,
    private appointmentNotificationService: AppointmentNotificationService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();

    // Subscribe to real-time appointment notifications
    const notificationSub =
      this.appointmentNotificationService.appointmentNotifications$.subscribe(
        (notification) => {
          if (notification) {
            // Add to recent notifications
            this.recentNotifications = [
              {
                id: notification.appointmentId,
                message:
                  this.appointmentNotificationService.getNotificationMessage(
                    notification
                  ),
                colorClass:
                  this.appointmentNotificationService.getNotificationColorClass(
                    notification
                  ),
                time: new Date(),
              },
              ...this.recentNotifications.slice(0, 4), // Keep only the 5 most recent
            ];

            // Refresh appointments to update list
            this.loadAppointments();
          }
        }
      );

    this.subscriptions.push(notificationSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getPatientAppointments().subscribe({
      next: (appointments) => {
        // Filter for upcoming appointments
        this.upcomingAppointments = appointments
          .filter(
            (app: Appointment) =>
              app.status !== 'cancelled' &&
              app.status !== 'completed' &&
              new Date(app.startTime) >= new Date()
          )
          .sort(
            (a: Appointment, b: Appointment) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
          .slice(0, 5); // Show only the next 5 appointments
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading appointments:', err);
        this.loading = false;
      },
    });
  }
}
