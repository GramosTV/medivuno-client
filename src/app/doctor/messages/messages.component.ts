import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../shared/interfaces/message.interface'; // Import shared interface

@Component({
  selector: 'app-messages',
  standalone: true, // Component is standalone
  imports: [CommonModule], // Add CommonModule for *ngFor, | date pipe etc.
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit {
  messages: Message[] = [];
  selectedMessage: Message | null = null;
  // Assuming the logged-in doctor's name for context, replace with actual auth data
  currentDoctorName: string = 'Dr. Emily Carter';

  constructor() {}

  ngOnInit(): void {
    // Dummy messages for display from a doctor's perspective
    this.messages = [
      {
        id: 'msgDoc1',
        sender: 'patient', // Corrected: Literal type
        senderName: 'John Doe',
        receiverName: this.currentDoctorName,
        patientId: 'patient123',
        subject: 'Question about medication side effects',
        content:
          "Hi Dr. Carter, I started the new medication yesterday and I'm experiencing some mild nausea. Is this normal and should I continue taking it?",
        timestamp: new Date('2025-05-10T11:00:00'),
        read: false,
        isSenderDoctor: false,
      },
      {
        id: 'msgDoc2',
        sender: 'doctor', // Corrected: Literal type
        senderName: this.currentDoctorName,
        receiverName: 'Sarah Miller',
        patientId: 'patient456',
        subject: 'Re: Your recent lab results',
        content:
          "Hello Sarah, I have reviewed your recent lab results. Most things look good, but I'd like to discuss your cholesterol levels. Please schedule a follow-up or a call at your convenience.",
        timestamp: new Date('2025-05-09T17:30:00'),
        read: true,
        isSenderDoctor: true,
      },
      {
        id: 'msgDoc3',
        sender: 'patient', // Corrected: Literal type
        senderName: 'Michael Brown',
        receiverName: this.currentDoctorName,
        patientId: 'patient789',
        subject: 'Request for prescription refill - Allergy medication',
        content:
          'Dear Dr. Carter, I am running low on my allergy medication (Cetirizine 10mg) and would like to request a refill. Thank you.',
        timestamp: new Date('2025-05-11T08:15:00'), // Today
        read: false,
        isSenderDoctor: false,
      },
      {
        id: 'msgDoc4',
        sender: 'doctor', // Corrected: Literal type
        senderName: this.currentDoctorName,
        receiverName: 'John Doe',
        patientId: 'patient123',
        subject: 'Re: Question about medication side effects',
        content:
          'Hi John, mild nausea can be a common initial side effect for that medication. It often subsides within a few days. However, if it worsens or you have other concerns, please let me know immediately or call the clinic.',
        timestamp: new Date('2025-05-10T14:20:00'),
        read: true,
        isSenderDoctor: true,
      },
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by most recent
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;
    if (!message.isSenderDoctor && !message.read) {
      // Only mark as read if received from patient and not already read
      message.read = true;
      // In a real app, update read status on the backend
    }
  }

  closeMessageView(): void {
    this.selectedMessage = null;
  }

  // Placeholder for future reply functionality
  replyToMessage(message: Message): void {
    console.log(
      'Replying to message from patient:',
      message.senderName,
      message.subject
    );
    // This would likely open a new message composition view or inline reply,
    // pre-filled with recipient (patient) and subject.
  }

  // Placeholder for future new message functionality
  createNewMessageToPatient(): void {
    console.log('Creating new message to a patient');
    // This would navigate to a new message composition page/modal,
    // possibly with a patient selection step.
  }
}
