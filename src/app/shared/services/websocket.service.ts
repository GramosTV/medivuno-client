import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { Message } from '../interfaces/message.interface';

// Role types from server
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

enum MessageEvents {
  NEW_MESSAGE = 'new_message',
  MESSAGE_READ = 'message_read',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  TYPING_START = 'typing_start',
  TYPING_END = 'typing_end',
}

enum AppointmentEvents {
  CREATED = 'appointment_created',
  UPDATED = 'appointment_updated',
  CANCELLED = 'appointment_cancelled',
  REMINDER = 'appointment_reminder',
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  socket!: Socket;
  private connected = new BehaviorSubject<boolean>(false);
  connected$ = this.connected.asObservable();

  private newMessages = new BehaviorSubject<Message | null>(null);
  newMessages$ = this.newMessages.asObservable();

  private messageRead = new BehaviorSubject<{
    id: string;
    status: string;
  } | null>(null);
  messageRead$ = this.messageRead.asObservable();

  private typingUsers = new BehaviorSubject<{ userId: string } | null>(null);
  typingUsers$ = this.typingUsers.asObservable();

  // Appointment event subjects
  private appointmentCreated = new BehaviorSubject<any | null>(null);
  appointmentCreated$ = this.appointmentCreated.asObservable();

  private appointmentUpdated = new BehaviorSubject<any | null>(null);
  appointmentUpdated$ = this.appointmentUpdated.asObservable();

  private appointmentCancelled = new BehaviorSubject<any | null>(null);
  appointmentCancelled$ = this.appointmentCancelled.asObservable();

  private appointmentReminder = new BehaviorSubject<any | null>(null);
  appointmentReminder$ = this.appointmentReminder.asObservable();

  private authSubscription: Subscription;

  constructor(private authService: AuthService) {
    // Initialize socket connection when service is created
    this.initSocketConnection();

    // Re-initialize socket when auth state changes
    this.authSubscription = this.authService.currentUser.subscribe((user) => {
      if (user) {
        this.initSocketConnection();
      } else {
        this.disconnect();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.disconnect();
  }
  private initSocketConnection(): void {
    // Get authentication token
    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('No auth token available for WebSocket connection');
      return;
    }

    // Clean up any existing connection
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    // Create socket connection with token in auth
    this.socket = io(environment.wsUrl || environment.apiUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      timeout: 8000,
      auth: {
        token: token,
      },
    });

    // Listen for connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected.next(true);
      this.joinUserRoom();
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      this.connected.next(false);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connected.next(false);
    });

    // Listen for message events
    this.socket.on(MessageEvents.NEW_MESSAGE, (message) => {
      console.log('New message received:', message);
      // Convert server message to client message format
      const clientMessage: Message = {
        id: message.id,
        sender:
          message.sender.role === 'admin' ||
          message.sender.role === 'doctor' ||
          message.sender.role === Role.ADMIN ||
          message.sender.role === Role.DOCTOR
            ? 'doctor'
            : 'patient',
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        receiverName: `${message.recipient.firstName} ${message.recipient.lastName}`,
        patientId:
          message.sender.role === 'admin' ||
          message.sender.role === 'doctor' ||
          message.sender.role === Role.ADMIN ||
          message.sender.role === Role.DOCTOR
            ? message.recipient.id
            : message.sender.id,
        doctorId:
          message.sender.role === 'admin' ||
          message.sender.role === 'doctor' ||
          message.sender.role === Role.ADMIN ||
          message.sender.role === Role.DOCTOR
            ? message.sender.id
            : message.recipient.id,
        subject: message.subject,
        content: message.content,
        timestamp: new Date(message.createdAt),
        read: message.status !== 'UNREAD',
        isSenderDoctor:
          message.sender.role === 'admin' ||
          message.sender.role === 'doctor' ||
          message.sender.role === Role.ADMIN ||
          message.sender.role === Role.DOCTOR,
      };
      this.newMessages.next(clientMessage);
    });
    this.socket.on(MessageEvents.MESSAGE_READ, (data) => {
      console.log('Message marked as read:', data);
      this.messageRead.next(data);
    });

    // Typing indicators
    this.socket.on(MessageEvents.TYPING_START, (data) => {
      console.log('User started typing:', data);
      this.typingUsers.next(data);
    });

    this.socket.on(MessageEvents.TYPING_END, (data) => {
      console.log('User stopped typing:', data);
      this.typingUsers.next(null);
    });

    // Appointment events
    this.socket.on(AppointmentEvents.CREATED, (data) => {
      console.log('Appointment created:', data);
      this.appointmentCreated.next(data);
    });

    this.socket.on(AppointmentEvents.UPDATED, (data) => {
      console.log('Appointment updated:', data);
      this.appointmentUpdated.next(data);
    });

    this.socket.on(AppointmentEvents.CANCELLED, (data) => {
      console.log('Appointment cancelled:', data);
      this.appointmentCancelled.next(data);
    });

    this.socket.on(AppointmentEvents.REMINDER, (data) => {
      console.log('Appointment reminder:', data);
      this.appointmentReminder.next(data);
    });

    // Connect to socket server
    this.socket.connect();

    // Setup reconnection handling
    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`WebSocket reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.connected.next(true);

      // Re-join user's room after reconnection
      this.joinUserRoom();
    });
  } // Join user's room using JWT token for authentication
  joinUserRoom(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      // Get user profile from token
      const userProfile = this.authService.getProfileFromToken();

      if (userProfile && userProfile.id) {
        // Join user-specific room
        this.socket.emit(
          MessageEvents.JOIN_ROOM,
          { token, room: `user-${userProfile.id}` },
          (response: any) => {
            console.log(`Join user room response:`, response);

            // Also join role-specific room based on user role
            if (response.success) {
              const roleRoom = this.getRoleRoomName(userProfile.role);
              this.socket.emit(
                MessageEvents.JOIN_ROOM,
                { token, room: roleRoom },
                (roleResponse: any) => {
                  console.log(
                    `Join role room ${roleRoom} response:`,
                    roleResponse
                  );
                }
              );
            }
          }
        );
      }
    }
  }

  // Helper method to determine role-specific room name
  private getRoleRoomName(role: string): string {
    // Handle both old and new role names
    switch (role.toLowerCase()) {
      case 'admin':
      case 'doctor':
        return 'role-doctor';
      case 'user':
      case 'patient':
        return 'role-patient';
      default:
        return `role-${role.toLowerCase()}`;
    }
  } // Join user room for appointment notifications
  joinAppointmentRoom(): Observable<any> {
    if (!this.socket.connected) {
      console.log('WebSocket not connected for appointment room');
      this.socket.connect();
    }

    return new Observable((observer) => {
      const token = this.authService.getAccessToken();

      if (!token) {
        observer.error('No auth token available');
        observer.complete();
        return;
      }

      // Join room using token for authentication
      this.socket.emit('join_room', { token }, (response: any) => {
        if (response.data && response.data.success) {
          console.log('Joined appointment room successfully');
          observer.next(response);
          observer.complete();
        } else {
          console.error('Failed to join appointment room:', response);
          observer.error(
            response.data?.error || 'Failed to join appointment room'
          );
          observer.complete();
        }
      });
    });
  }
  // Send a message through WebSocket
  sendMessage(message: any): Observable<any> {
    return new Observable((observer) => {
      const token = this.authService.getAccessToken();
      if (!token) {
        observer.error('Not authenticated');
        return;
      }

      this.socket.emit(
        MessageEvents.NEW_MESSAGE,
        { token, message },
        (response: any) => {
          if (response.event === 'error') {
            observer.error(response.data);
          } else {
            observer.next(response.data);
          }
          observer.complete();
        }
      );
    });
  }
  // Mark a message as read through WebSocket
  markMessageAsRead(messageId: string): Observable<any> {
    return new Observable((observer) => {
      const token = this.authService.getAccessToken();
      if (!token) {
        observer.error('Not authenticated');
        return;
      }

      this.socket.emit(
        MessageEvents.MESSAGE_READ,
        { token, messageId },
        (response: any) => {
          if (response.event === 'error') {
            observer.error(response.data);
          } else {
            observer.next(response.data);
          }
          observer.complete();
        }
      );
    });
  }
  // Send typing indicator
  sendTypingStart(recipientId: string): Observable<any> {
    return new Observable((observer) => {
      const token = this.authService.getAccessToken();
      if (!token) {
        observer.error('Not authenticated');
        return;
      }

      this.socket.emit(
        MessageEvents.TYPING_START,
        { token, recipientId },
        (response: any) => {
          if (response.event === 'error') {
            observer.error(response.data);
          } else {
            observer.next(response.data);
          }
          observer.complete();
        }
      );
    });
  }

  // Send end typing indicator
  sendTypingEnd(recipientId: string): Observable<any> {
    return new Observable((observer) => {
      const token = this.authService.getAccessToken();
      if (!token) {
        observer.error('Not authenticated');
        return;
      }

      this.socket.emit(
        MessageEvents.TYPING_END,
        { token, recipientId },
        (response: any) => {
          if (response.event === 'error') {
            observer.error(response.data);
          } else {
            observer.next(response.data);
          }
          observer.complete();
        }
      );
    });
  }

  public joinRoom(room: string, callback?: (success: boolean) => void): void {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot join room:', room);
      if (callback) callback(false);
      return;
    }

    this.socket.emit(
      MessageEvents.JOIN_ROOM,
      { room },
      (response: { success: boolean }) => {
        console.log(`Join room ${room} response:`, response);
        if (callback) callback(response.success);
      }
    );
  }

  public leaveRoom(room: string, callback?: (success: boolean) => void): void {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot leave room:', room);
      if (callback) callback(false);
      return;
    }

    this.socket.emit(
      MessageEvents.LEAVE_ROOM,
      { room },
      (response: { success: boolean }) => {
        console.log(`Leave room ${room} response:`, response);
        if (callback) callback(response.success);
      }
    );
  }
  // Using the public joinUserRoom method instead

  // Clean up on service destroy
  disconnect(): void {
    if (this.socket) {
      console.log('Manually disconnecting WebSocket');
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.connected.next(false);
    }
  }

  // Allow setting user's online status
  setOnlineStatus(isOnline: boolean): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot set online status: WebSocket not connected');
      return;
    }

    this.socket.emit(
      'set_online_status',
      { isOnline },
      (response: { success: boolean }) => {
        console.log(`Set online status (${isOnline}) response:`, response);
      }
    );
  }

  // Test if WebSocket connection is working properly
  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.connected) {
        resolve(true);
        return;
      }

      // Try to connect
      this.initSocketConnection();

      // Set a timeout in case connection takes too long
      const timeoutId = setTimeout(() => {
        console.error('WebSocket connection test timed out');
        resolve(false);
      }, 5000); // 5 second timeout

      // Listen for successful connection
      const connectListener = () => {
        clearTimeout(timeoutId);
        this.socket.off('connect', connectListener);
        this.socket.off('connect_error', errorListener);
        console.log('WebSocket connection test successful');
        resolve(true);
      };

      // Listen for connection error
      const errorListener = (err: any) => {
        clearTimeout(timeoutId);
        this.socket.off('connect', connectListener);
        this.socket.off('connect_error', errorListener);
        console.error('WebSocket connection test failed:', err);
        resolve(false);
      };
      // Add listeners
      this.socket.once('connect', connectListener);
      this.socket.once('connect_error', errorListener);

      // Try to connect
      this.socket.connect();
    });
  }
}
