import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MedicalRecordService } from '../../shared/services/medical-record.service';
import {
  MedicalRecord,
  MedicalRecordType,
} from '../../shared/interfaces/medical-record.interface';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-doctor-medical-records',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './doctor-medical-records.component.html',
  styleUrls: ['./doctor-medical-records.component.scss'],
})
export class DoctorMedicalRecordsComponent implements OnInit {
  medicalRecords: MedicalRecord[] = [];
  selectedRecord: MedicalRecord | null = null;
  patientId: string = '';
  patientName: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private medicalRecordService: MedicalRecordService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.patientId = params['patientId'];
      // In a real app, you would fetch the patient details to get their name
      this.patientName = 'Patient';
      this.loadMedicalRecords();
    });
  }

  /**
   * Load medical records from the API
   */
  loadMedicalRecords(): void {
    this.isLoading = true;
    this.error = null;

    this.medicalRecordService
      .getPatientRecords(this.patientId)
      .pipe(
        catchError((err) => {
          this.error =
            'Failed to load medical records. Please try again later.';
          console.error('Error loading medical records:', err);
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((records) => {
        // Convert date strings to Date objects
        this.medicalRecords = records
          .map((record) => ({
            ...record,
            date: record.date
              ? new Date(record.date)
              : new Date(record.recordDate || Date.now()),
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      });
  }

  viewRecordDetails(record: MedicalRecord): void {
    this.selectedRecord = record;
  }

  closeRecordDetails(): void {
    this.selectedRecord = null;
  }

  createNewRecord(): void {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  deleteRecord(id: string): void {
    if (
      !confirm(
        'Are you sure you want to delete this record? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.isLoading = true;
    this.medicalRecordService
      .deleteMedicalRecord(id)
      .pipe(
        catchError((err) => {
          this.error = 'Failed to delete record. Please try again later.';
          console.error('Error deleting record:', err);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(() => {
        this.loadMedicalRecords();
        this.selectedRecord = null;
      });
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
