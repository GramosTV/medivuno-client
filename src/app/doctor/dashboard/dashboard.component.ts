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
  todayAppointmentsCount = 0;
  pendingAppointmentsCount = 0;
  totalAppointmentsCount = 0;
  loading = false;
  recentNotifications: any[] = [];
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

            // Refresh appointments to update counts
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

    this.appointmentService.getDoctorAppointments().subscribe({
      next: (appointments) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Count today's appointments
        this.todayAppointmentsCount = appointments.filter((apt) => {
          const aptDate = new Date(apt.startTime);
          return (
            aptDate >= today && aptDate < tomorrow && apt.status !== 'cancelled'
          );
        }).length;

        // Count pending appointments
        this.pendingAppointmentsCount = appointments.filter(
          (apt) => apt.status === 'pending'
        ).length;

        // Count all active appointments
        this.totalAppointmentsCount = appointments.filter(
          (apt) => apt.status !== 'cancelled' && apt.status !== 'completed'
        ).length;

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading appointments', error);
        this.loading = false;
      },
    });
  }
}
