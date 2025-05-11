import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Message } from '../../shared/interfaces/message.interface';

interface DoctorRecipient {
  id: string;
  name: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule here
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit {
  messages: Message[] = [];
  selectedMessage: Message | null = null;

  // State for composing/replying
  isComposing: boolean = false;
  isReplying: boolean = false;

  // Form fields for new/reply message
  replyContent: string = '';
  newMessageTo: string = ''; // For new messages, this could be a doctor's ID or name
  newMessageSubject: string = '';
  newMessageContent: string = '';
  currentMessageContent: string = ''; // Used for the textarea

  // Dummy list of doctors for "To" field in new message
  availableDoctors: DoctorRecipient[] = [
    { id: 'doc1', name: 'Dr. Emily Carter' },
    { id: 'doc2', name: 'Dr. Alice Smith' },
    { id: 'doc3', name: 'Dr. Bob Johnson' },
  ];

  constructor() {}

  ngOnInit(): void {
    // Dummy messages for display
    this.messages = [
      {
        id: '1',
        sender: 'doctor' as 'doctor', // Explicitly cast sender
        senderName: 'Dr. Emily Carter',
        receiverName: 'John Doe', // Assuming patient is John Doe
        subject: 'Re: Follow-up on your recent check-up',
        content:
          'Hello John, I reviewed your test results and everything looks good. We can discuss them in more detail during your next appointment if you like. Let me know if you have any immediate concerns.',
        timestamp: new Date('2025-05-08T10:30:00'),
        read: false,
      },
      {
        id: '2',
        sender: 'patient' as 'patient', // Explicitly cast sender
        senderName: 'John Doe',
        receiverName: 'Dr. Emily Carter',
        subject: 'Question about medication',
        content:
          'Hi Dr. Carter, I have a quick question about the new medication you prescribed. Can I take it with food? Thanks!',
        timestamp: new Date('2025-05-09T14:15:00'),
        read: true,
      },
      {
        id: '3',
        sender: 'doctor' as 'doctor', // Explicitly cast sender
        senderName: 'Dr. Emily Carter',
        receiverName: 'John Doe',
        subject: 'Re: Question about medication',
        content:
          'Hi John, yes, it is recommended to take that medication with food to minimize potential stomach upset. Feel free to reach out if you have more questions.',
        timestamp: new Date('2025-05-09T16:45:00'),
        read: true,
      },
      {
        id: '4',
        sender: 'patient' as 'patient', // Explicitly cast sender
        senderName: 'John Doe',
        receiverName: 'Dr. Smith (Cardiology)',
        subject: 'Appointment Confirmation for May 15th',
        content:
          'Hello Dr. Smith, I would like to confirm my appointment scheduled for May 15th at 2:00 PM. Please let me know if there are any changes. Thank you.',
        timestamp: new Date('2025-05-10T09:00:00'),
        read: false,
      },
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;
    message.read = true;
    this.isComposing = false; // Ensure compose form is hidden
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
    this.isComposing = false; // Explicitly set composing to false
    this.newMessageTo = this.selectedMessage.senderName; // Reply to the sender of the selected message
    this.newMessageSubject = `Re: ${this.selectedMessage.subject}`;
    this.currentMessageContent = ''; // Clear for reply
    this.selectedMessage = null; // Close the detailed message view to show reply form
  }

  startNewMessage(): void {
    this.isComposing = true;
    this.isReplying = false; // Explicitly set replying to false
    this.newMessageTo = '';
    this.newMessageSubject = '';
    this.currentMessageContent = ''; // Clear for new message
    this.selectedMessage = null; // Close any open message
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.currentMessageContent = '';
    this.newMessageTo = '';
    this.newMessageSubject = '';
    // newMessageContent and replyContent are not directly bound, but clear them for consistency if needed
    this.newMessageContent = '';
    this.replyContent = '';
  }

  sendMessage(): void {
    let messageToSend = '';
    if (this.isReplying) {
      messageToSend = this.currentMessageContent; // Use currentMessageContent for reply
      // Logic for sending a reply
      console.log('Sending reply:', {
        to: this.newMessageTo,
        subject: this.newMessageSubject,
        content: messageToSend,
      });
      const newReply: Message = {
        id: `msg${Date.now()}`,
        sender: 'patient' as 'patient',
        senderName: 'John Doe',
        receiverName: this.newMessageTo,
        subject: this.newMessageSubject,
        content: messageToSend,
        timestamp: new Date(),
        read: true,
      };
      this.messages.unshift(newReply);
    } else if (this.isComposing) {
      messageToSend = this.currentMessageContent; // Use currentMessageContent for new message
      // Logic for sending a new message
      console.log('Sending new message:', {
        to: this.newMessageTo,
        subject: this.newMessageSubject,
        content: messageToSend,
      });
      const newMessage: Message = {
        id: `msg${Date.now()}`,
        sender: 'patient' as 'patient',
        senderName: 'John Doe',
        receiverName: this.newMessageTo,
        subject: this.newMessageSubject,
        content: messageToSend,
        timestamp: new Date(),
        read: true,
      };
      this.messages.unshift(newMessage);
    }
    this.messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.cancelComposition();
  }
}
