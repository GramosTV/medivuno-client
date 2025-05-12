import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import { NotificationService } from './notification.service';
import { AuthService } from '../../core/auth.service';
import { Message as ClientMessage } from '../interfaces/message.interface';

export interface CreateMessageDto {
  subject: string;
  content: string;
  recipientId: string;
  parentMessageId?: string;
}

export enum MessageStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export interface Message {
  id: string;
  sender: 'doctor' | 'patient';
  senderName: string;
  receiverName: string;
  patientId: string;
  doctorId: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  isSenderDoctor: boolean;
}

export interface ServerMessage {
  id: string;
  subject: string;
  content: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  status: MessageStatus;
  parentMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;

  // BehaviorSubjects for tracking message state
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private newMessageSubject = new Subject<Message>();
  private messageReadSubject = new Subject<string>();
  private typingUsersSubject = new BehaviorSubject<{ [key: string]: boolean }>(
    {}
  );

  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();
  public messageRead$ = this.messageReadSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();

  // Debounce variables for typing indicators
  private typingTimeout: { [key: string]: any } = {};
  private typingDelay = 2000; // 2 seconds

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    // Listen for new messages from WebSocket
    this.webSocketService.newMessages$.subscribe((wsMessage) => {
      if (wsMessage) {
        // Convert from external message format to our internal format if needed
        if (!this.isInternalMessageFormat(wsMessage)) {
          const convertedMessage = this.convertToInternalMessage(wsMessage);
          this.handleNewMessage(convertedMessage);
        } else {
          this.handleNewMessage(wsMessage as Message);
        }
      }
    });

    // Listen for message read updates from WebSocket
    this.webSocketService.messageRead$.subscribe((update) => {
      if (update) {
        this.handleMessageReadUpdate(update.id);
      }
    });

    // Listen for typing indicators
    this.webSocketService.typingUsers$.subscribe((typing) => {
      if (typing) {
        this.handleTypingIndicator(typing.userId);
      }
    });
  }

  // Handle new messages from WebSocket
  private handleNewMessage(message: Message): void {
    // Add to messages array if not already there
    const currentMessages = this.messagesSubject.getValue();
    if (!currentMessages.some((m) => m.id === message.id)) {
      this.messagesSubject.next([...currentMessages, message]);
    }

    // Emit as new message
    this.newMessageSubject.next(message);

    // Create notification only if message is from someone else
    const currentUser = this.authService.getCurrentUserProfile();
    const isCurrentUserDoctor =
      currentUser?.role === 'doctor' || currentUser?.role === 'admin';
    const isCurrentUserPatient =
      currentUser?.role === 'patient' || currentUser?.role === 'user';

    if (
      (isCurrentUserDoctor && !message.isSenderDoctor) ||
      (isCurrentUserPatient && message.isSenderDoctor)
    ) {
      // Add notification
      this.notificationService.addNotification({
        type: 'message',
        title: `New message from ${message.senderName}`,
        content: message.subject || 'Click to view message',
        route: isCurrentUserDoctor ? '/doctor/messages' : '/patient/messages',
        metadata: { messageId: message.id },
      });
    }
  }

  // Handle message read updates from WebSocket
  private handleMessageReadUpdate(messageId: string): void {
    // Update message in array
    const currentMessages = this.messagesSubject.getValue();
    const updatedMessages = currentMessages.map((message) =>
      message.id === messageId ? { ...message, read: true } : message
    );
    this.messagesSubject.next(updatedMessages);

    // Emit message read event
    this.messageReadSubject.next(messageId);
  }

  // Handle typing indicator from WebSocket
  private handleTypingIndicator(userId: string): void {
    // Set user as typing
    const currentTypingUsers = this.typingUsersSubject.getValue();
    this.typingUsersSubject.next({
      ...currentTypingUsers,
      [userId]: true,
    });

    // Clear typing status after delay
    if (this.typingTimeout[userId]) {
      clearTimeout(this.typingTimeout[userId]);
    }

    this.typingTimeout[userId] = setTimeout(() => {
      const currentTypingUsers = this.typingUsersSubject.getValue();
      const updatedTypingUsers = { ...currentTypingUsers };
      delete updatedTypingUsers[userId];
      this.typingUsersSubject.next(updatedTypingUsers);
    }, this.typingDelay);
  }

  // Get all messages for the current user (inbox + sent)
  getAllMessages(): Observable<Message[]> {
    return this.http
      .get<ServerMessage[]>(this.apiUrl)
      .pipe(
        map((messages) => this.mapServerMessagesToClientMessages(messages))
      );
  }

  // Get inbox messages (where user is recipient)
  getInbox(): Observable<Message[]> {
    return this.http
      .get<ServerMessage[]>(`${this.apiUrl}/inbox`)
      .pipe(
        map((messages) => this.mapServerMessagesToClientMessages(messages))
      );
  }

  // Get sent messages (where user is sender)
  getSent(): Observable<Message[]> {
    return this.http
      .get<ServerMessage[]>(`${this.apiUrl}/sent`)
      .pipe(
        map((messages) => this.mapServerMessagesToClientMessages(messages))
      );
  }

  // Get a specific message by ID
  getMessage(id: string): Observable<Message> {
    return this.http
      .get<ServerMessage>(`${this.apiUrl}/${id}`)
      .pipe(map((message) => this.mapServerMessageToClientMessage(message)));
  }

  // Get thread of messages
  getMessageThread(id: string): Observable<Message[]> {
    return this.http
      .get<ServerMessage[]>(`${this.apiUrl}/${id}/thread`)
      .pipe(
        map((messages) => this.mapServerMessagesToClientMessages(messages))
      );
  }

  // Send a new message
  sendMessage(messageData: CreateMessageDto): Observable<Message> {
    // Check if WebSocket is connected for real-time messaging
    if (this.webSocketService.connected$) {
      return this.webSocketService
        .sendMessage(messageData)
        .pipe(
          map((serverMessage: ServerMessage) =>
            this.mapServerMessageToClientMessage(serverMessage)
          )
        );
    } else {
      // Fall back to HTTP if WebSocket is not available
      return this.http
        .post<ServerMessage>(this.apiUrl, messageData)
        .pipe(map((message) => this.mapServerMessageToClientMessage(message)));
    }
  }

  // Mark a message as read
  markAsRead(id: string): Observable<Message> {
    // Check if WebSocket is connected for real-time messaging
    if (this.webSocketService.connected$) {
      return this.webSocketService
        .markMessageAsRead(id)
        .pipe(
          map((serverMessage: ServerMessage) =>
            this.mapServerMessageToClientMessage(serverMessage)
          )
        );
    } else {
      // Fall back to HTTP if WebSocket is not available
      return this.http
        .patch<ServerMessage>(`${this.apiUrl}/${id}`, {
          status: MessageStatus.READ,
        })
        .pipe(map((message) => this.mapServerMessageToClientMessage(message)));
    }
  }

  // Archive a message
  archiveMessage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Helper method to map server message format to client message format
  private mapServerMessageToClientMessage(message: ServerMessage): Message {
    const isSenderDoctor =
      message.sender.role === 'admin' || message.sender.role === 'doctor';

    return {
      id: message.id,
      sender: isSenderDoctor ? 'doctor' : 'patient',
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      receiverName: `${message.recipient.firstName} ${message.recipient.lastName}`,
      patientId: !isSenderDoctor ? message.sender.id : message.recipient.id,
      doctorId: isSenderDoctor ? message.sender.id : message.recipient.id,
      subject: message.subject,
      content: message.content,
      timestamp: new Date(message.createdAt),
      read: message.status !== MessageStatus.UNREAD,
      isSenderDoctor,
    };
  }

  private mapServerMessagesToClientMessages(
    messages: ServerMessage[]
  ): Message[] {
    return messages.map((message) =>
      this.mapServerMessageToClientMessage(message)
    );
  }

  // Helper method to check if a message is already in our internal format
  private isInternalMessageFormat(message: any): boolean {
    return (
      message &&
      typeof message === 'object' &&
      'id' in message &&
      'sender' in message &&
      'senderName' in message &&
      'receiverName' in message &&
      'subject' in message &&
      'content' in message &&
      'timestamp' in message &&
      'read' in message
    );
  }

  // Convert from WebSocket message format to internal message format
  private convertToInternalMessage(wsMessage: any): Message {
    // If it looks like a ServerMessage, use our existing converter
    if (
      wsMessage &&
      wsMessage.sender &&
      wsMessage.recipient &&
      wsMessage.subject &&
      wsMessage.content
    ) {
      return this.mapServerMessageToClientMessage(wsMessage as ServerMessage);
    }

    // Handle other formats that might come from WebSocket
    // This is a fallback and should be improved based on actual data format
    const isSenderDoctor =
      wsMessage.senderRole === 'admin' || wsMessage.senderRole === 'doctor';

    return {
      id: wsMessage.id || `temp-${Date.now()}`,
      sender: isSenderDoctor ? 'doctor' : 'patient',
      senderName: wsMessage.senderName || 'Unknown Sender',
      receiverName: wsMessage.receiverName || 'Unknown Recipient',
      patientId: isSenderDoctor ? wsMessage.recipientId : wsMessage.senderId,
      doctorId: isSenderDoctor ? wsMessage.senderId : wsMessage.recipientId,
      subject: wsMessage.subject || 'No Subject',
      content: wsMessage.content || '',
      timestamp: wsMessage.createdAt
        ? new Date(wsMessage.createdAt)
        : new Date(),
      read: wsMessage.status !== 'UNREAD',
      isSenderDoctor,
    };
  }
}
