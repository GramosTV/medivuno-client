import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../shared/interfaces/message.interface';
import {
  MessageService,
  CreateMessageDto,
} from '../shared/services/message.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit {
  messages: Message[] = [];
  selectedMessage: Message | null = null;
  messageThread: Message[] = [];

  // Tab selection
  activeTab: 'inbox' | 'sent' = 'inbox';

  // State for composing/replying
  isComposing: boolean = false;
  isReplying: boolean = false;
  isViewingThread: boolean = false;

  // Loading and error states
  loading: boolean = false;
  error: string | null = null;
  sendingMessage: boolean = false;

  // Form fields for new/reply message
  newMessageContent: string = '';
  newMessageSubject: string = '';
  newMessagePatientId: string = '';

  // Stored patients from messages for easy selection
  patients: Map<string, { id: string; name: string }> = new Map();

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading = true;
    this.error = null;

    const observable =
      this.activeTab === 'inbox'
        ? this.messageService.getInbox()
        : this.messageService.getSent();

    observable.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (messages) => {
        this.messages = messages;

        // Build patient list from messages for easy reference
        messages.forEach((message) => {
          if (message.patientId && !this.patients.has(message.patientId)) {
            const patientName =
              message.sender === 'patient'
                ? message.senderName
                : message.receiverName;
            this.patients.set(message.patientId, {
              id: message.patientId,
              name: patientName,
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.error = 'Failed to load messages. Please try again.';
      },
    });
  }

  switchTab(tab: 'inbox' | 'sent'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.selectedMessage = null;
      this.isComposing = false;
      this.isReplying = false;
      this.isViewingThread = false;
      this.loadMessages();
    }
  }

  viewMessage(message: Message): void {
    if (this.selectedMessage && this.selectedMessage.id === message.id) {
      this.selectedMessage = null;
      return;
    }

    this.loading = true;
    this.isComposing = false;
    this.isReplying = false;
    this.isViewingThread = false;

    // Mark message as read if not already
    if (!message.read) {
      this.messageService.markAsRead(message.id).subscribe({
        next: (updatedMessage) => {
          // Update the message in our local array
          const index = this.messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            this.messages[index] = updatedMessage;
          }
        },
        error: (error) =>
          console.error('Error marking message as read:', error),
      });
    }

    this.messageService
      .getMessage(message.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (fullMessage) => {
          this.selectedMessage = fullMessage;
        },
        error: (error) => {
          console.error('Error fetching message details:', error);
          this.error = 'Failed to load message details. Please try again.';
        },
      });
  }

  viewMessageThread(message: Message): void {
    this.loading = true;
    this.isViewingThread = true;
    this.isComposing = false;
    this.isReplying = false;

    this.messageService
      .getMessageThread(message.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (thread) => {
          this.messageThread = thread;
          this.selectedMessage = null;
        },
        error: (error) => {
          console.error('Error fetching message thread:', error);
          this.error = 'Failed to load message thread. Please try again.';
          this.isViewingThread = false;
        },
      });
  }

  closeView(): void {
    this.selectedMessage = null;
    this.isViewingThread = false;
    this.messageThread = [];
  }

  startNewMessage(): void {
    this.isComposing = true;
    this.isReplying = false;
    this.isViewingThread = false;
    this.selectedMessage = null;
    this.newMessagePatientId = '';
    this.newMessageSubject = '';
    this.newMessageContent = '';
  }

  startReply(message: Message): void {
    this.isReplying = true;
    this.isComposing = false;
    this.isViewingThread = false;
    this.selectedMessage = message;

    this.newMessagePatientId = message.patientId || '';
    this.newMessageSubject = message.subject.startsWith('Re: ')
      ? message.subject
      : `Re: ${message.subject}`;
    this.newMessageContent = '';
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.newMessagePatientId = '';
    this.newMessageSubject = '';
    this.newMessageContent = '';
  }

  sendMessage(): void {
    if (
      !this.newMessagePatientId ||
      !this.newMessageSubject ||
      !this.newMessageContent
    ) {
      this.error = 'Please complete all message fields.';
      return;
    }

    this.sendingMessage = true;
    this.error = null;

    const messageData: CreateMessageDto = {
      subject: this.newMessageSubject,
      content: this.newMessageContent,
      recipientId: this.newMessagePatientId,
      // If replying, include parent message ID
      parentMessageId:
        this.isReplying && this.selectedMessage
          ? this.selectedMessage.id
          : undefined,
    };

    this.messageService
      .sendMessage(messageData)
      .pipe(finalize(() => (this.sendingMessage = false)))
      .subscribe({
        next: (sentMessage) => {
          console.log('Message sent successfully:', sentMessage);

          // Add to our existing messages if we're in sent tab
          if (this.activeTab === 'sent') {
            this.messages = [sentMessage, ...this.messages];
          }

          // Reset the form
          this.cancelComposition();

          // If we're in a thread view, refresh the thread
          if (this.isViewingThread && this.selectedMessage) {
            this.viewMessageThread(this.selectedMessage);
          }
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.error = 'Failed to send message. Please try again.';
        },
      });
  }

  archiveMessage(messageId: string): void {
    this.loading = true;

    this.messageService
      .archiveMessage(messageId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          // Remove from messages list
          this.messages = this.messages.filter((m) => m.id !== messageId);

          // Close the message if it was selected
          if (this.selectedMessage && this.selectedMessage.id === messageId) {
            this.selectedMessage = null;
          }
        },
        error: (error) => {
          console.error('Error archiving message:', error);
          this.error = 'Failed to archive message. Please try again.';
        },
      });
  }

  getPatientArray(): Array<{ id: string; name: string }> {
    return Array.from(this.patients.values());
  }
}
