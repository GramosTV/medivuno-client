import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../shared/interfaces/message.interface';
import {
  MessageService,
  CreateMessageDto,
} from '../../shared/services/message.service';
import {
  AppointmentService,
  Patient,
} from '../../shared/services/appointment.service';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WebSocketService } from '../../shared/services/websocket.service';
import { Subject, Subscription } from 'rxjs';

interface PatientRecipient {
  id: string;
  name: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  sentMessages: Message[] = [];
  selectedMessage: Message | null = null;
  activeTab: 'inbox' | 'sent' = 'inbox';

  // State for composing/replying
  isComposing: boolean = false;
  isReplying: boolean = false;

  // Loading and error states
  loading: boolean = false;
  error: string | null = null;
  sendingMessage: boolean = false;

  // Form fields for new/reply message
  newMessageToPatientId: string = '';
  newMessageSubject: string = '';
  currentMessageContent: string = '';
  replyingToPatientName: string = '';

  // Available patients from backend
  availablePatients: PatientRecipient[] = [];

  // Typing indicators
  typingUsers: { userId: string }[] = [];
  private typingSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  isTyping = false;
  typingMessage = '';

  constructor(
    private messageService: MessageService,
    private appointmentService: AppointmentService,
    private webSocketService: WebSocketService
  ) {
    // Setup typing debounce
    const typingSubscription = this.typingSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((recipientId) => {
        if (recipientId && this.isTyping) {
          this.webSocketService.sendTypingStart(recipientId).subscribe();
        }
      });

    this.subscriptions.push(typingSubscription);
  }

  ngOnInit(): void {
    this.loadInboxMessages();
    this.loadSentMessages();
    this.loadPatients();

    // Subscribe to real-time new messages
    const newMessageSub = this.messageService.newMessage$.subscribe(
      (message) => {
        if (message) {
          // Add the new message to the appropriate list if it's not already there
          if (!message.isSenderDoctor) {
            // It's an incoming message for the doctor
            const exists = this.messages.some((m) => m.id === message.id);
            if (!exists) {
              this.messages = [message, ...this.messages];
            }
          } else {
            // It's a sent message by the doctor
            const exists = this.sentMessages.some((m) => m.id === message.id);
            if (!exists) {
              this.sentMessages = [message, ...this.sentMessages];
            }
          }
        }
      }
    );
    this.subscriptions.push(newMessageSub);

    // Subscribe to message read events
    const readMessageSub = this.messageService.messageRead$.subscribe(
      (messageId) => {
        if (messageId) {
          // Update in inbox messages
          const inboxIndex = this.messages.findIndex((m) => m.id === messageId);
          if (inboxIndex !== -1) {
            this.messages[inboxIndex] = {
              ...this.messages[inboxIndex],
              read: true,
            };
          }

          // Update in sent messages
          const sentIndex = this.sentMessages.findIndex(
            (m) => m.id === messageId
          );
          if (sentIndex !== -1) {
            this.sentMessages[sentIndex] = {
              ...this.sentMessages[sentIndex],
              read: true,
            };
          }

          // Also update selected message if it's the one that was read
          if (this.selectedMessage && this.selectedMessage.id === messageId) {
            this.selectedMessage = { ...this.selectedMessage, read: true };
          }
        }
      }
    );
    this.subscriptions.push(readMessageSub);

    // Subscribe to typing indicators
    const typingIndicatorSub = this.webSocketService.typingUsers$.subscribe(
      (typingInfo) => {
        if (typingInfo) {
          // Add to typing users if not already there
          if (!this.typingUsers.some((u) => u.userId === typingInfo.userId)) {
            this.typingUsers.push(typingInfo);

            // Update typing message
            this.updateTypingMessage();
          }

          // Auto remove after 3 seconds if no further typing events
          setTimeout(() => {
            this.typingUsers = this.typingUsers.filter(
              (u) => u.userId !== typingInfo.userId
            );
            this.updateTypingMessage();
          }, 3000);
        }
      }
    );
    this.subscriptions.push(typingIndicatorSub);
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadInboxMessages(): void {
    this.loading = true;
    this.error = null;

    this.messageService
      .getInbox()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          console.log('Loaded inbox messages:', messages);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.error = 'Failed to load inbox messages. Please try again.';
        },
      });
  }

  loadSentMessages(): void {
    this.loading = true;
    this.error = null;

    this.messageService
      .getSent()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (messages) => {
          this.sentMessages = messages;
          console.log('Loaded sent messages:', messages);
        },
        error: (error) => {
          console.error('Error loading sent messages:', error);
          this.error = 'Failed to load sent messages. Please try again.';
        },
      });
  }

  setActiveTab(tab: 'inbox' | 'sent'): void {
    this.activeTab = tab;
    if (tab === 'inbox' && this.messages.length === 0) {
      this.loadInboxMessages();
    } else if (tab === 'sent' && this.sentMessages.length === 0) {
      this.loadSentMessages();
    }
  }

  loadPatients(): void {
    // In a real app, you would have an API to get the doctor's patients or all patients
    // For now, we'll use dummy data or make a placeholder for the future API call

    // Placeholder for API call to get patients
    // this.patientService.getPatients().subscribe({...});

    // For now, just use dummy data
    this.availablePatients = [
      { id: 'patient1', name: 'John Doe' },
      { id: 'patient2', name: 'Jane Smith' },
      { id: 'patient3', name: 'Robert Johnson' },
    ];
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;

    if (!message.read && message.sender === 'patient') {
      this.messageService.markAsRead(message.id).subscribe({
        next: () => {
          message.read = true;
          console.log('Message marked as read');
        },
        error: (error) =>
          console.error('Error marking message as read:', error),
      });
    }

    // If this is part of a thread, load the full thread
    this.messageService.getMessageThread(message.id).subscribe({
      next: (thread) => {
        if (thread.length > 1) {
          console.log('Loaded message thread:', thread);
          // You could update the UI to show the thread here
        }
      },
      error: (error) => console.error('Error loading message thread:', error),
    });

    this.isComposing = false;
    this.isReplying = false;
  }

  closeMessageView(): void {
    this.selectedMessage = null;
    this.isComposing = false;
    this.isReplying = false;
  }

  startReplyToPatient(): void {
    if (!this.selectedMessage) return;
    this.isReplying = true;
    this.isComposing = false;

    this.newMessageToPatientId = this.selectedMessage.patientId || '';
    this.replyingToPatientName = this.selectedMessage.senderName;
    this.newMessageSubject = `Re: ${this.selectedMessage.subject}`;
    this.currentMessageContent = '';
  }

  startNewMessageToPatient(): void {
    this.isComposing = true;
    this.isReplying = false;
    this.newMessageToPatientId = '';
    this.newMessageSubject = '';
    this.currentMessageContent = '';
    this.replyingToPatientName = '';
    this.selectedMessage = null;
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.currentMessageContent = '';
    this.newMessageToPatientId = '';
    this.replyingToPatientName = '';
    this.newMessageSubject = '';
  }

  sendMessage(): void {
    if (
      !this.currentMessageContent ||
      !this.newMessageSubject ||
      !this.newMessageToPatientId
    ) {
      this.error = 'Please complete all required fields.';
      return;
    }

    const messageData: CreateMessageDto = {
      subject: this.newMessageSubject,
      content: this.currentMessageContent,
      recipientId: this.newMessageToPatientId,
      // If replying to a message, include parent message ID
      parentMessageId:
        this.isReplying && this.selectedMessage
          ? this.selectedMessage.id
          : undefined,
    };

    this.sendingMessage = true;

    this.messageService
      .sendMessage(messageData)
      .pipe(finalize(() => (this.sendingMessage = false)))
      .subscribe({
        next: (sentMessage) => {
          console.log('Message sent successfully:', sentMessage);

          // Update the appropriate message list
          if (this.activeTab === 'inbox') {
            this.loadInboxMessages();
          } else {
            this.loadSentMessages();
          }

          this.cancelComposition();
          this.error = null;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.error = 'Failed to send message. Please try again.';
        },
      });
  }

  // Updates message in UI showing who is typing
  updateTypingMessage(): void {
    if (this.typingUsers.length === 0) {
      this.typingMessage = '';
    } else if (this.typingUsers.length === 1) {
      this.typingMessage = 'Patient is typing...';
    } else {
      this.typingMessage = 'Multiple patients are typing...';
    }
  }

  // Track user typing to send events
  onTyping(): void {
    if (this.newMessageToPatientId && !this.isTyping) {
      this.isTyping = true;
      this.typingSubject.next(this.newMessageToPatientId);

      // Stop typing after 1.5 seconds of inactivity
      setTimeout(() => {
        this.isTyping = false;
        if (this.newMessageToPatientId) {
          this.webSocketService
            .sendTypingEnd(this.newMessageToPatientId)
            .subscribe();
        }
      }, 1500);
    }
  }
}
