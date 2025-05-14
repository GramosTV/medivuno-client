import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { AuthService } from '../../core/auth.service';

// Import the shared models
import {
  Message as GoMessage,
  MessageStatus as GoMessageStatus,
  User,
} from '../interfaces/models';

// Response wrapper from Go backend
interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface CreateMessageDto {
  content: string;
  recipientId: string; // Changed to match backend expectation
  // Optional fields that could be used for threading or subject
  parentMessageId?: string;
  subject?: string;
}

// Keep the existing enum for backward compatibility
export enum MessageStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

// The interface our frontend components expect
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

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  // Updated to use the Go backend API structure
  private apiUrl = `${environment.apiUrl}/api/v1/messages`;

  // BehaviorSubjects for tracking message state
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private newMessageSubject = new Subject<Message>();
  private messageReadSubject = new Subject<string>();

  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();
  public messageRead$ = this.messageReadSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    // Initialize service
    console.log('Message service initialized with Go backend at', this.apiUrl);
  }

  // Get all messages for the current user
  getMessages(): Observable<Message[]> {
    console.log('Fetching messages from API:', this.apiUrl);
    return this.http.get<ApiResponse<GoMessage[]>>(this.apiUrl).pipe(
      tap((response) => console.log('Raw API response:', response)),
      map((response) => response.data || []),
      tap((messages) => console.log('Extracted messages data:', messages)),
      map((messages) => this.mapGoMessagesToClientMessages(messages)),
      tap((mappedMessages) => {
        console.log('Mapped client messages:', mappedMessages);
        // Update the local message cache
        this.messagesSubject.next(mappedMessages);
      }),
      catchError((error) => {
        console.error('Error fetching messages:', error);
        return throwError(
          () => new Error('Failed to load messages from server')
        );
      })
    );
  } // Get inbox messages - messages received by the current user
  getInbox(): Observable<Message[]> {
    console.log('MessageService: getInbox() called');
    return this.getMessages().pipe(
      tap((messages) =>
        console.log('MessageService: Raw messages before filtering:', messages)
      ),
      map((messages) => {
        const currentUser = this.authService.getCurrentUserProfile();
        console.log('MessageService: Current user profile:', currentUser);

        const isDoctor =
          currentUser?.role === 'doctor' || currentUser?.role === 'admin';
        console.log('MessageService: isDoctor =', isDoctor); // Fix for inbox logic:
        // - For doctors: Show messages where they are the receiver AND patient is sender
        // - For patients: Show messages where they are the receiver AND doctor is sender
        const filteredMessages = messages.filter((m) => {
          let keep;

          if (isDoctor) {
            // For doctors: Show messages FROM patients TO this doctor
            keep = !m.isSenderDoctor && m.doctorId === currentUser?.id;
            console.log(
              `MessageService: Message ${m.id} - isSenderDoctor = ${m.isSenderDoctor}, doctorId = ${m.doctorId}, senderId = ${m.sender}, currentUserId = ${currentUser?.id}, keep = ${keep}`
            );
          } else {
            // For patients: Show messages FROM doctors TO this patient
            // We need to check sender is 'doctor' because isSenderDoctor might be incorrect
            keep =
              (m.isSenderDoctor || m.sender === 'doctor') &&
              m.patientId === currentUser?.id;
            console.log(
              `MessageService: Message ${m.id} - isSenderDoctor = ${m.isSenderDoctor}, sender = ${m.sender}, patientId = ${m.patientId}, currentUserId = ${currentUser?.id}, keep = ${keep}`
            );
          }

          return keep;
        });

        console.log(
          'MessageService: Filtered inbox messages:',
          filteredMessages
        );
        return filteredMessages;
      })
    );
  }
  // Get sent messages - messages sent by the current user
  getSent(): Observable<Message[]> {
    console.log('MessageService: getSent() called');
    return this.getMessages().pipe(
      tap((messages) =>
        console.log(
          'MessageService: Raw messages before sent filtering:',
          messages
        )
      ),
      map((messages) => {
        const currentUser = this.authService.getCurrentUserProfile();
        console.log(
          'MessageService: Current user profile for sent messages:',
          currentUser
        );

        const isCurrentUserDoctor =
          currentUser?.role === 'doctor' || currentUser?.role === 'admin';
        console.log(
          'MessageService: isCurrentUserDoctor =',
          isCurrentUserDoctor
        );

        // Improved filter for sent messages:
        // - If user is doctor, show messages where doctor is sender (this doctor specifically)
        // - If user is patient, show messages where patient is sender (this patient specifically)
        const filteredMessages = messages.filter((m) => {
          let keep;

          if (isCurrentUserDoctor) {
            // For doctors: Check that they are messages FROM this doctor (sender)
            keep = m.isSenderDoctor && m.doctorId === currentUser?.id;
            console.log(
              `MessageService: Sent message ${m.id} - isSenderDoctor = ${m.isSenderDoctor}, doctorId = ${m.doctorId}, currentUserId = ${currentUser?.id}, keep = ${keep}`
            );
          } else {
            // For patients: Check that they are messages FROM this patient (sender)
            keep = !m.isSenderDoctor && m.patientId === currentUser?.id;
            console.log(
              `MessageService: Sent message ${m.id} - isSenderDoctor = ${m.isSenderDoctor}, patientId = ${m.patientId}, currentUserId = ${currentUser?.id}, keep = ${keep}`
            );
          }

          return keep;
        });

        console.log(
          'MessageService: Filtered sent messages:',
          filteredMessages
        );
        return filteredMessages;
      })
    );
  }

  getMessageThread(messageId: string): Observable<Message[]> {
    return this.http
      .get<ApiResponse<GoMessage[]>>(`${this.apiUrl}/thread/${messageId}`)
      .pipe(
        map((response) => response.data),
        map((messages) => this.mapGoMessagesToClientMessages(messages))
      );
  }

  // Get a conversation between current user and another user
  getConversation(userId: string): Observable<Message[]> {
    return this.http
      .get<ApiResponse<GoMessage[]>>(`${this.apiUrl}/conversation/${userId}`)
      .pipe(
        map((response) => response.data),
        map((messages) => this.mapGoMessagesToClientMessages(messages)),
        tap((messages) => {
          // Update the local message cache for this conversation
          const currentMessages = this.messagesSubject.getValue();
          const otherMessages = currentMessages.filter(
            (m) => m.doctorId !== userId && m.patientId !== userId
          );
          this.messagesSubject.next([...otherMessages, ...messages]);
        })
      );
  }

  // Send a message
  sendMessage(messageData: any): Observable<Message> {
    // Adapt the messageData to handle both formats (backward compatibility)
    const goMessageData: CreateMessageDto = {
      content: messageData.content,
      recipientId: messageData.recipientId || messageData.receiverId, // Use recipientId as the backend expects
      subject: messageData.subject || 'No Subject',
      parentMessageId: messageData.parentMessageId,
    };

    console.log('Sending message with data:', goMessageData);

    return this.http
      .post<ApiResponse<GoMessage>>(`${this.apiUrl}/send`, goMessageData)
      .pipe(
        map((response) => response.data),
        map((message) => this.mapGoMessageToClientMessage(message)),
        tap((message) => {
          // Handle the new message
          this.handleNewMessage(message);
        }),
        catchError((error) => {
          console.error('Error in sendMessage:', error);
          // Add detailed error logging
          if (error.status === 403) {
            console.error(
              'Authorization error: User does not have permission to send this message'
            );
          }
          throw error;
        })
      );
  }

  // Mark a message as read
  markAsRead(id: string): Observable<Message> {
    return this.http
      .patch<ApiResponse<GoMessage>>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        map((response) => response.data),
        map((message) => this.mapGoMessageToClientMessage(message)),
        tap((message) => {
          // Update the message read status
          this.handleMessageReadUpdate(id);
        })
      );
  }

  // Archive a message
  archiveMessage(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  // Handle new message notification
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

  // Handle message read updates
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
  // Helper method to map Go message format to client message format
  private mapGoMessageToClientMessage(message: GoMessage): Message {
    const currentUser = this.authService.getCurrentUserProfile();

    // Debug full message structure
    console.log(
      'MessageService: mapGoMessageToClientMessage - Raw Message:',
      JSON.stringify(message, null, 2)
    );
    console.log('MessageService: Current User:', currentUser); // Determine if the sender is a doctor based on their role
    // Need to handle uppercase roles from backend
    const senderRoleLower = message.sender?.role?.toLowerCase();
    const isSenderDoctor =
      senderRoleLower === 'admin' || senderRoleLower === 'doctor';

    console.log(
      'MessageService: isSenderDoctor =',
      isSenderDoctor,
      'sender role =',
      message.sender?.role,
      'normalized to lowercase =',
      senderRoleLower
    );

    // Determine if current user is the sender
    const isSentByCurrentUser = message.senderId === currentUser?.id;
    console.log('MessageService: isSentByCurrentUser =', isSentByCurrentUser);

    let patientId, doctorId; // Set doctorId and patientId based on sender's role - handle uppercase role values
    const senderRole = message.sender?.role?.toLowerCase();
    if (senderRole === 'doctor' || senderRole === 'admin') {
      doctorId = message.senderId;
      patientId = message.receiverId;
    } else {
      patientId = message.senderId;
      doctorId = message.receiverId;
    }

    console.log(
      `MessageService: Set doctorId=${doctorId}, patientId=${patientId}`
    ); // Setting correct values based on the actual role
    const mappedMessage: Message = {
      id: message.id,
      // Ensure proper value for 'sender' based on uppercased role from backend
      sender:
        message.sender?.role?.toLowerCase() === 'doctor' ||
        message.sender?.role?.toLowerCase() === 'admin'
          ? 'doctor'
          : 'patient',
      senderName: message.sender
        ? `${message.sender.firstName} ${message.sender.lastName}`
        : 'Unknown',
      receiverName: message.receiver
        ? `${message.receiver.firstName} ${message.receiver.lastName}`
        : 'Unknown',
      patientId: patientId,
      doctorId: doctorId,
      subject: message.subject || 'No Subject', // Use the subject from backend
      content: message.content,
      timestamp: new Date(message.createdAt),
      read: message.status === 'read',
      // Critical fix: set isSenderDoctor based on the actual role from backend
      isSenderDoctor: senderRole === 'doctor' || senderRole === 'admin',
    };

    console.log('MessageService: Mapped message:', mappedMessage);

    console.log('MessageService: Mapped message:', mappedMessage);
    return mappedMessage;
  }

  // Map multiple Go messages to client message format
  public mapGoMessagesToClientMessages(messages: GoMessage[]): Message[] {
    return messages.map((message) => this.mapGoMessageToClientMessage(message));
  }

  // Get new messages since a specific date
  getNewMessagesSince(sinceDate: Date): Observable<Message[]> {
    const timestamp = sinceDate.toISOString();
    return this.http
      .get<ApiResponse<GoMessage[]>>(`${this.apiUrl}/new?since=${timestamp}`)
      .pipe(
        map((response) => response.data),
        map((messages) => this.mapGoMessagesToClientMessages(messages)),
        catchError((err) => {
          console.error('Error fetching new messages:', err);
          return throwError(() => new Error('Failed to fetch new messages'));
        })
      );
  }
}
