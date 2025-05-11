import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../shared/interfaces/message.interface'; // Import shared interface

@Component({
  selector: 'app-messages',
  standalone: true, // Make component standalone
  imports: [CommonModule], // Add CommonModule to imports
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit {
  messages: Message[] = [];
  selectedMessage: Message | null = null;

  constructor() {}

  ngOnInit(): void {
    // Dummy messages for display
    this.messages = [
      {
        id: '1',
        sender: 'doctor',
        senderName: 'Dr. Emily Carter',
        receiverName: 'John Doe',
        subject: 'Re: Follow-up on your recent check-up',
        content:
          'Hello John, I reviewed your test results and everything looks good. We can discuss them in more detail during your next appointment if you like. Let me know if you have any immediate concerns.',
        timestamp: new Date('2025-05-08T10:30:00'),
        read: false,
      },
      {
        id: '2',
        sender: 'patient',
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
        sender: 'doctor',
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
        sender: 'patient',
        senderName: 'John Doe',
        receiverName: 'Dr. Smith (Cardiology)',
        subject: 'Appointment Confirmation for May 15th',
        content:
          'Hello Dr. Smith, I would like to confirm my appointment scheduled for May 15th at 2:00 PM. Please let me know if there are any changes. Thank you.',
        timestamp: new Date('2025-05-10T09:00:00'),
        read: false,
      },
    ];
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;
    message.read = true; // Mark as read when viewed
    // In a real app, you would also update the backend
  }

  closeMessageView(): void {
    this.selectedMessage = null;
  }

  // Placeholder for future reply functionality
  replyToMessage(message: Message): void {
    console.log('Replying to message:', message);
    // This would likely open a new message composition view or inline reply
  }

  // Placeholder for future new message functionality
  createNewMessage(): void {
    console.log('Creating new message');
    // This would navigate to a new message composition page/modal
  }
}
