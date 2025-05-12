import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../shared/interfaces/message.interface';
import {
  MessageService,
  CreateMessageDto,
} from '../../shared/services/message.service';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  AppointmentService,
  Doctor,
} from '../../shared/services/appointment.service';
import { WebSocketService } from '../../shared/services/websocket.service';
import { Subject, Subscription } from 'rxjs';

interface DoctorRecipient {
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
  selectedMessage: Message | null = null;

  // State for composing/replying
  isComposing: boolean = false;
  isReplying: boolean = false;

  // Loading and error states
  loading: boolean = false;
  error: string | null = null;
  sendingMessage: boolean = false;

  // Form fields for new/reply message
  newMessageTo: string = '';
  newMessageSubject: string = '';
  currentMessageContent: string = '';
  selectedDoctorId: string = '';

  // Available doctors from backend
  availableDoctors: DoctorRecipient[] = [];

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
    this.loadMessages();
    this.loadDoctors();

    // Subscribe to real-time new messages
    const newMessageSub = this.messageService.newMessage$.subscribe(
      (message) => {
        if (message) {
          // Add the new message to the list if it's not already there
          const exists = this.messages.some((m) => m.id === message.id);
          if (!exists) {
            this.messages = [message, ...this.messages];
          }
        }
      }
    );
    this.subscriptions.push(newMessageSub);

    // Subscribe to message read events
    const readMessageSub = this.messageService.messageRead$.subscribe(
      (messageId) => {
        if (messageId) {
          // Update message read status in the list
          const index = this.messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            this.messages[index] = { ...this.messages[index], read: true };
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

  // Updates message in UI showing who is typing
  updateTypingMessage(): void {
    if (this.typingUsers.length === 0) {
      this.typingMessage = '';
    } else if (this.typingUsers.length === 1) {
      this.typingMessage = 'Someone is typing...';
    } else {
      this.typingMessage = 'Multiple people are typing...';
    }
  }

  // Track user typing to send events
  onTyping(): void {
    if (this.selectedDoctorId && !this.isTyping) {
      this.isTyping = true;
      this.typingSubject.next(this.selectedDoctorId);

      // Stop typing after 1.5 seconds of inactivity
      setTimeout(() => {
        this.isTyping = false;
        if (this.selectedDoctorId) {
          this.webSocketService
            .sendTypingEnd(this.selectedDoctorId)
            .subscribe();
        }
      }, 1500);
    }
  }

  loadMessages(): void {
    this.loading = true;
    this.error = null;

    this.messageService
      .getInbox()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          console.log('Loaded messages:', messages);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.error = 'Failed to load messages. Please try again.';
        },
      });
  }

  loadDoctors(): void {
    this.appointmentService.getAllDoctors().subscribe({
      next: (doctors: Doctor[]) => {
        this.availableDoctors = doctors.map((doctor) => ({
          id: doctor.id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        }));
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      },
    });
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;

    if (!message.read) {
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

  startReply(): void {
    if (!this.selectedMessage) return;
    this.isReplying = true;
    this.isComposing = false;

    // If the message is from a doctor, we can reply directly
    if (this.selectedMessage.sender === 'doctor') {
      // Find the doctor ID from the message
      this.selectedDoctorId = this.selectedMessage.doctorId || '';
      this.newMessageTo = this.selectedMessage.senderName;
    } else {
      // If it's our own message, reply to the recipient
      this.selectedDoctorId = '';
      this.newMessageTo = this.selectedMessage.receiverName;
    }

    this.newMessageSubject = `Re: ${this.selectedMessage.subject}`;
    this.currentMessageContent = '';
  }

  startNewMessage(): void {
    this.isComposing = true;
    this.isReplying = false;
    this.selectedDoctorId = '';
    this.newMessageTo = '';
    this.newMessageSubject = '';
    this.currentMessageContent = '';
    this.selectedMessage = null;
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.currentMessageContent = '';
    this.newMessageTo = '';
    this.newMessageSubject = '';
    this.selectedDoctorId = '';
  }

  sendMessage(): void {
    if (!this.currentMessageContent || !this.newMessageSubject) {
      this.error = 'Please complete all required fields.';
      return;
    }

    // Get the selected doctor ID
    let recipientId = this.selectedDoctorId;

    // If we're replying to a message and don't have a doctor ID, try to get it from the message
    if (this.isReplying && !recipientId && this.selectedMessage) {
      recipientId = this.selectedMessage.doctorId || '';
    }

    // For new messages, get the doctor ID from the selected dropdown option
    if (this.isComposing && !recipientId) {
      const selectedDoctor = this.availableDoctors.find(
        (d) => d.name === this.newMessageTo
      );
      if (selectedDoctor) {
        recipientId = selectedDoctor.id;
      }
    }

    if (!recipientId) {
      this.error =
        'Unable to determine message recipient. Please select a doctor.';
      return;
    }

    const messageData: CreateMessageDto = {
      subject: this.newMessageSubject,
      content: this.currentMessageContent,
      recipientId: recipientId,
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
          // Reload messages to show the sent message
          this.loadMessages();
          this.cancelComposition();
          this.error = null;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.error = 'Failed to send message. Please try again.';
        },
      });
  }
}
