import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Message } from '../../shared/interfaces/message.interface';

interface PatientRecipient {
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
  currentDoctorName: string = 'Dr. Emily Carter'; // Replace with actual auth data

  // State for composing/replying
  isComposing: boolean = false;
  isReplying: boolean = false;

  // Form fields for new/reply message
  replyContent: string = '';
  newMessageToPatientId: string = ''; // For new messages to a patient
  newMessageSubject: string = '';
  newMessageContent: string = '';
  currentMessageContent: string = ''; // Used for the textarea
  replyingToPatientName: string = ''; // Store patient name for reply view

  // Dummy list of patients for "To" field in new message
  // In a real app, this would come from a service, likely searchable
  availablePatients: PatientRecipient[] = [
    { id: 'patient123', name: 'John Doe' },
    { id: 'patient456', name: 'Sarah Miller' },
    { id: 'patient789', name: 'Michael Brown' },
    { id: 'patient101', name: 'Jessica Taylo' },
  ];

  constructor() {}

  ngOnInit(): void {
    this.messages = [
      {
        id: 'msgDoc1',
        sender: 'patient' as 'patient',
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
        sender: 'doctor' as 'doctor',
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
        sender: 'patient' as 'patient',
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
        sender: 'doctor' as 'doctor',
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
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  viewMessage(message: Message): void {
    this.selectedMessage = message;
    if (!message.isSenderDoctor && !message.read) {
      message.read = true;
    }
    this.isComposing = false;
    this.isReplying = false;
  }

  closeMessageView(): void {
    this.selectedMessage = null;
    this.isComposing = false;
    this.isReplying = false;
  }

  startReplyToPatient(): void {
    if (!this.selectedMessage || this.selectedMessage.isSenderDoctor) return; // Can only reply to patient messages
    this.isReplying = true;
    this.isComposing = false;
    this.newMessageToPatientId = this.selectedMessage.patientId || '';
    // Set the patient name for the read-only field in the reply form
    const patient = this.availablePatients.find(
      (p) => p.id === this.newMessageToPatientId
    );
    this.replyingToPatientName = patient ? patient.name : 'Unknown Patient';
    this.newMessageSubject = `Re: ${this.selectedMessage.subject}`;
    this.currentMessageContent = ''; // Clear for reply
    this.selectedMessage = null; // Close detail view to show reply form
  }

  startNewMessageToPatient(): void {
    this.isComposing = true;
    this.isReplying = false;
    this.newMessageToPatientId = '';
    this.newMessageSubject = '';
    this.currentMessageContent = ''; // Clear for new message
    this.selectedMessage = null;
  }

  cancelComposition(): void {
    this.isComposing = false;
    this.isReplying = false;
    this.currentMessageContent = '';
    this.newMessageToPatientId = '';
    this.replyingToPatientName = ''; // Clear patient name on cancel
    this.newMessageSubject = '';
    this.newMessageContent = ''; // Clear for consistency
    this.replyContent = ''; // Clear for consistency
  }

  sendMessage(): void {
    const recipientPatient = this.availablePatients.find(
      (p) => p.id === this.newMessageToPatientId
    );
    const recipientName = recipientPatient
      ? recipientPatient.name
      : 'Unknown Patient';
    let messageToSend = '';

    if (this.isReplying) {
      messageToSend = this.currentMessageContent; // Use currentMessageContent for reply
      console.log('Sending reply to patient:', {
        patientId: this.newMessageToPatientId,
        subject: this.newMessageSubject,
        content: messageToSend,
      });
      const newReply: Message = {
        id: `msgDoc${Date.now()}`,
        sender: 'doctor',
        senderName: this.currentDoctorName,
        receiverName: recipientName,
        patientId: this.newMessageToPatientId,
        subject: this.newMessageSubject,
        content: messageToSend,
        timestamp: new Date(),
        read: true,
        isSenderDoctor: true,
      };
      this.messages.unshift(newReply);
    } else if (this.isComposing) {
      messageToSend = this.currentMessageContent; // Use currentMessageContent for new message
      console.log('Sending new message to patient:', {
        patientId: this.newMessageToPatientId,
        subject: this.newMessageSubject,
        content: messageToSend,
      });
      const newMessage: Message = {
        id: `msgDoc${Date.now()}`,
        sender: 'doctor',
        senderName: this.currentDoctorName,
        receiverName: recipientName,
        patientId: this.newMessageToPatientId,
        subject: this.newMessageSubject,
        content: messageToSend,
        timestamp: new Date(),
        read: true,
        isSenderDoctor: true,
      };
      this.messages.unshift(newMessage);
    }
    this.messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.cancelComposition();
  }
}
