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
import { MessagePollingService } from '../../shared/services/message-polling.service';
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

  private subscriptions: Subscription[] = [];

  constructor(
    private messageService: MessageService,
    private appointmentService: AppointmentService,
    private messagePollingService: MessagePollingService
  ) {}

  ngOnInit(): void {
    this.loadMessages();
    this.loadDoctors();

    // Start polling for new messages
    this.messagePollingService.startPolling(5000); // Poll every 5 seconds

    // Subscribe to new messages from polling
    const newMessageSub = this.messagePollingService.newMessage$.subscribe(
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
    const readMessageSub = this.messagePollingService.messageRead$.subscribe(
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
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
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

    this.newMessageSubject = `Re: ${
      this.selectedMessage.subject || 'No Subject'
    }`;
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
    this.error = null; // Clear any previous errors

    // Ensure doctors are loaded
    this.loadDoctors();
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.currentMessageContent = '';
    this.selectedDoctorId = '';
    this.newMessageSubject = '';
  }
  sendMessage(): void {
    // Debug message to see values
    console.log('Sending message with:', {
      content: this.currentMessageContent,
      subject: this.newMessageSubject,
      doctorId: this.selectedDoctorId,
      isComposing: this.isComposing,
      isReplying: this.isReplying,
    });

    // Check for required fields
    if (!this.currentMessageContent) {
      this.error = 'Please enter a message content.';
      return;
    }

    if (!this.newMessageSubject) {
      this.error = 'Please enter a subject.';
      return;
    }

    if (this.isComposing && !this.selectedDoctorId) {
      this.error = 'Please select a doctor to send the message to.';
      return;
    }

    if (this.isReplying && !this.selectedDoctorId) {
      this.error =
        'Unable to determine recipient. Please cancel and try again.';
      return;
    }

    const messageData: CreateMessageDto = {
      content: this.currentMessageContent,
      subject: this.newMessageSubject,
      recipientId: this.selectedDoctorId, // Note: Changed from receiverId to recipientId
      // If replying to a message, include parent message ID
      parentMessageId:
        this.isReplying && this.selectedMessage
          ? this.selectedMessage.id
          : undefined,
    };

    this.sendingMessage = true;
    console.log('Message data being sent:', messageData);

    this.messageService
      .sendMessage(messageData)
      .pipe(finalize(() => (this.sendingMessage = false)))
      .subscribe({
        next: (sentMessage) => {
          console.log('Message sent successfully:', sentMessage);
          this.messages = [sentMessage, ...this.messages];
          this.cancelComposition();
          this.error = null;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          if (error.error && error.error.message) {
            this.error = `Failed to send message: ${error.error.message}`;
          } else {
            this.error = 'Failed to send message. Please try again.';
          }
        },
      });
  }
  onDoctorSelectionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedIndex = select.selectedIndex;

    // If a valid option is selected (not the disabled placeholder)
    if (selectedIndex > 0) {
      const selectedOption = select.options[selectedIndex];
      const doctorId = selectedOption.getAttribute('data-id') || '';
      this.selectedDoctorId = doctorId;
      console.log('Selected doctor ID:', doctorId);
    } else {
      this.selectedDoctorId = '';
    }
  }
}
