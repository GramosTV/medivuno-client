import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';

export interface Notification {
  id: string;
  type: 'message' | 'appointment' | 'reminder' | 'system';
  title: string;
  content: string;
  read: boolean;
  createdAt: Date;
  route?: string; // Optional navigation route
  metadata?: any; // Any additional data
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private audioContext: AudioContext | null = null;
  private notificationSound: AudioBuffer | null = null;
  private soundLoaded = false;
  private soundLoading = false;

  // Track notifications for the current user
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Track unread notification count
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private authService: AuthService) {
    try {
      // Create audio context when the service is initialized
      window.AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      this.preloadNotificationSound();
    } catch (e) {
      console.warn('Web Audio API is not supported in this browser');
    }

    // Clear notifications when user logs out
    this.authService.isLoggedIn.subscribe((loggedIn) => {
      if (!loggedIn) {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      }
    });
  }

  // Add a new notification
  public addNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
      read: false,
    };

    const currentNotifications = this.notificationsSubject.getValue();
    const updatedNotifications = [newNotification, ...currentNotifications];

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Play sound for new notifications
    this.playNotificationSound();
  }

  // Mark a specific notification as read
  public markAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.getValue();
    const updatedNotifications = currentNotifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  // Mark all notifications as read
  public markAllAsRead(): void {
    const currentNotifications = this.notificationsSubject.getValue();
    const updatedNotifications = currentNotifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    this.notificationsSubject.next(updatedNotifications);
    this.unreadCountSubject.next(0);

    // Play sound to confirm action
    this.playNotificationSound();
  }

  // Get the current unread count (used for initialization)
  public getUnreadCount(): number {
    const currentNotifications = this.notificationsSubject.getValue();
    return currentNotifications.filter((notification) => !notification.read)
      .length;
  }

  // Get all notifications
  public getNotifications(): Notification[] {
    return this.notificationsSubject.getValue();
  }

  // Remove a notification
  public removeNotification(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.getValue();
    const updatedNotifications = currentNotifications.filter(
      (notification) => notification.id !== notificationId
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  // Update the unread count
  private updateUnreadCount(): void {
    const currentNotifications = this.notificationsSubject.getValue();
    const unreadCount = currentNotifications.filter(
      (notification) => !notification.read
    ).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private preloadNotificationSound(): void {
    if (!this.audioContext || this.soundLoaded || this.soundLoading) return;

    this.soundLoading = true;

    // Create a simple ping sound programmatically
    const duration = 0.2; // Duration in seconds
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      // Create a ping sound with decreasing amplitude
      const t = i / sampleRate;
      const frequency = 1000; // Frequency in Hz
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-5 * t);
    }

    this.notificationSound = buffer;
    this.soundLoaded = true;
    this.soundLoading = false;
  }

  /**
   * Play a notification sound
   */
  playNotificationSound(): void {
    if (!this.audioContext || !this.notificationSound) {
      console.warn('Audio context or notification sound not available');
      return;
    }

    try {
      // Resume audio context if it was suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create source node and play the sound
      const source = this.audioContext.createBufferSource();
      source.buffer = this.notificationSound;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }
}
