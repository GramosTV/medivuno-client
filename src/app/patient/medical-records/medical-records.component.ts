import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MedicalRecord,
  MedicalRecordType,
} from '../../shared/interfaces/medical-record.interface';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.scss',
})
export class MedicalRecordsComponent implements OnInit {
  medicalRecords: MedicalRecord[] = [];
  selectedRecord: MedicalRecord | null = null;
  currentPatientId: string = 'patient123';

  constructor() {}

  ngOnInit(): void {
    this.medicalRecords = [
      {
        id: 'rec001',
        patientId: this.currentPatientId,
        recordType: 'ConsultationNote' as MedicalRecordType,
        date: new Date('2025-04-15T10:00:00'),
        title: 'Annual Check-up',
        doctorName: 'Dr. Emily Carter',
        department: 'General Medicine',
        summary:
          'Patient presented for annual physical. Overall health is good. Discussed diet and exercise.',
        details:
          'Vitals: BP 120/80, HR 70, Temp 36.5C. No acute complaints. Recommended continuing current medications. Follow up in 1 year or as needed.',
        attachments: [
          {
            fileName: 'ConsultationSummary_20250415.pdf',
            fileType: 'application/pdf',
            url: '#',
          },
        ],
      },
      {
        id: 'rec002',
        patientId: this.currentPatientId,
        recordType: 'LabResult' as MedicalRecordType,
        date: new Date('2025-04-18T14:30:00'),
        title: 'Blood Test Results - CBC & Lipid Panel',
        doctorName: 'Dr. Emily Carter',
        department: 'Laboratory Services',
        summary:
          'Complete Blood Count normal. Lipid panel shows slightly elevated LDL cholesterol.',
        details:
          'CBC: All values within normal range. Lipid Panel: Total Cholesterol 210 mg/dL, HDL 50 mg/dL, LDL 140 mg/dL, Triglycerides 150 mg/dL. Advised on dietary changes and follow-up lipid panel in 3 months.',
        attachments: [
          {
            fileName: 'LabReport_CBC_20250418.pdf',
            fileType: 'application/pdf',
            url: '#',
          },
          {
            fileName: 'LabReport_Lipid_20250418.pdf',
            fileType: 'application/pdf',
            url: '#',
          },
        ],
      },
      {
        id: 'rec003',
        patientId: this.currentPatientId,
        recordType: 'Prescription' as MedicalRecordType,
        date: new Date('2025-04-15T10:30:00'),
        title: 'Prescription - Amoxicillin',
        doctorName: 'Dr. Emily Carter',
        department: 'General Medicine',
        summary: 'Prescription for Amoxicillin 500mg for acute bronchitis.',
        details:
          'Amoxicillin 500mg, 1 tablet three times a day for 7 days. Instructions: Complete full course. Take with food if stomach upset occurs.',
      },
      {
        id: 'rec004',
        patientId: this.currentPatientId,
        recordType: 'ImagingReport' as MedicalRecordType,
        date: new Date('2024-11-20T09:00:00'),
        title: 'Chest X-Ray Report',
        doctorName: 'Dr. Alan Grant',
        department: 'Radiology',
        summary: 'No acute cardiopulmonary process identified.',
        details:
          'Lungs are clear. Heart size is normal. No pleural effusions or pneumothorax. Osseous structures are unremarkable.',
        attachments: [
          {
            fileName: 'ChestXRay_20241120.dicom.viewerlink',
            fileType: 'application/dicom',
            url: '#',
          },
          {
            fileName: 'RadiologyReport_20241120.pdf',
            fileType: 'application/pdf',
            url: '#',
          },
        ],
      },
      {
        id: 'rec005',
        patientId: this.currentPatientId,
        recordType: 'VaccinationRecord' as MedicalRecordType,
        date: new Date('2025-01-10T11:00:00'),
        title: 'Influenza Vaccine',
        doctorName: 'Nurse Practitioner Sarah Connor',
        department: 'Preventive Care Clinic',
        summary: 'Administered seasonal influenza vaccine.',
        details:
          'Vaccine: Fluzone High-Dose Quadrivalent. Lot #: AB123XYZ. Site: Left Deltoid. No adverse reactions observed.',
      },
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  viewRecordDetails(record: MedicalRecord): void {
    this.selectedRecord = record;
  }

  closeRecordDetails(): void {
    this.selectedRecord = null;
  }

  getRecordTypeIcon(recordType: MedicalRecordType): string {
    switch (recordType) {
      case 'ConsultationNote':
        return 'M10 4.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5ZM8.5 6a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3ZM15 8a1 1 0 0 0 1-1V4.5a1.5 1.5 0 0 0-1.5-1.5h-11A1.5 1.5 0 0 0 2 4.5V14.5A1.5 1.5 0 0 0 3.5 16h11a1.5 1.5 0 0 0 1.5-1.5V12h-2.5a.5.5 0 0 1 0-1H16V9h-2.5a.5.5 0 0 1 0-1H16Z';
      case 'LabResult':
        return 'M13.5 0H2.5A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0ZM9 12H7V9h2v3Zm0-4H7V5h2v3Zm4 4h-2V9h2v3Zm0-4h-2V5h2v3Z';
      case 'Prescription':
        return 'M3 11.5a1.5 1.5 0 0 0 3 0V10a1.5 1.5 0 0 0-3 0v1.5Zm0-4a1.5 1.5 0 0 0 3 0V6a1.5 1.5 0 0 0-3 0v1.5Zm0-4a1.5 1.5 0 0 0 3 0V2a1.5 1.5 0 0 0-3 0v1.5Z M8 10a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2H8Zm0-4a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2H8Zm0-4a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2H8Z';
      case 'ImagingReport':
        return 'M15.5 2h-15a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5ZM2 13V3h12v10H2Z M3 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2ZM3.5 9a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Z';
      case 'VaccinationRecord':
        return 'M8 0a1 1 0 0 0-1 1v2.035c-1.412.174-2.5 1.077-2.5 2.19V10a1 1 0 0 0 .577.908L8 12.25l2.923-1.342A1 1 0 0 0 11.5 10V5.225c0-1.113-1.088-2.016-2.5-2.19V1a1 1 0 0 0-1-1Zm0 3.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z';
      case 'AllergyRecord':
        return 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0ZM6.354 5.646a.5.5 0 1 0-.708.708L7.293 8l-1.647 1.646a.5.5 0 0 0 .708.708L8 8.707l1.646 1.647a.5.5 0 0 0 .708-.708L8.707 8l1.647-1.646a.5.5 0 0 0-.708-.708L8 7.293 6.354 5.646Z';
      case 'DischargeSummary':
        return 'M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4Zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm4 3.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0V5.5a.5.5 0 0 0-.5-.5Z M8 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z';
      default:
        return 'M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0Zm0 1L13 4.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5ZM5 6.5A.5.5 0 0 1 5.5 6h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6.5Zm0 2A.5.5 0 0 1 5.5 8h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8.5Zm0 2A.5.5 0 0 1 5.5 10h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 5 10.5Z';
    }
  }
}
