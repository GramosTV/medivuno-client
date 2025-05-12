import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';
import { MessageService } from '../services/message.service';
import {
  NotificationService,
  Notification,
} from '../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn$: Observable<boolean>;
  currentUserRole$: Observable<string | null>;
  unreadMessageCount: number = 0;
  unreadNotificationCount: number = 0;
  notifications: Notification[] = [];
  showNotifications: boolean = false;
  private messageSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  private notificationsListSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn;
    this.currentUserRole$ = this.authService.currentUserRole;
  }

  ngOnInit(): void {
    // Subscribe to new messages to update the unread count
    this.messageSubscription = this.messageService.newMessage$.subscribe(
      (message) => {
        if (message && !message.read) {
          this.unreadMessageCount++;
        }
      }
    );

    // Load initial unread message count
    this.loadUnreadMessageCount();

    // Subscribe to notifications to update the unread count
    this.notificationSubscription =
      this.notificationService.unreadCount$.subscribe((count) => {
        this.unreadNotificationCount = count;
      });

    // Subscribe to notifications list
    this.notificationsListSubscription =
      this.notificationService.notifications$.subscribe((notifications) => {
        this.notifications = notifications.slice(0, 10); // Show only the 10 most recent
      });
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }

    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }

    if (this.notificationsListSubscription) {
      this.notificationsListSubscription.unsubscribe();
    }
  }

  // Toggle notifications panel
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  // Close notifications when clicking elsewhere
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showNotifications = false;
    }
  }

  // Mark a specific notification as read
  markNotificationAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
    // Don't close the dropdown to allow for multiple interactions
  }

  // Mark all notifications as read
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  // Get appropriate icon class based on notification type
  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-500';
      case 'appointment':
        return 'bg-green-100 text-green-500';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-500';
      case 'system':
        return 'bg-purple-100 text-purple-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  }
  logout(): void {
    this.authService.logout();
    // Logout and navigation handled by auth service
  }

  private loadUnreadMessageCount(): void {
    this.isLoggedIn$.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.messageService.getInbox().subscribe((messages) => {
          this.unreadMessageCount = messages.filter(
            (message) => !message.read
          ).length;
        });
      }
    });
  }
}
