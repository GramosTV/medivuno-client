import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { catchError, finalize, of } from 'rxjs';

import { MedicalRecordService } from '../../shared/services/medical-record.service';
import { AuthService } from '../../core/auth.service';
import { MedicalRecordType } from '../../shared/interfaces/medical-record.interface';

@Component({
  selector: 'app-create-medical-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './create-medical-record.component.html',
  styleUrls: ['./create-medical-record.component.scss'],
})
export class CreateMedicalRecordComponent implements OnInit {
  recordForm: FormGroup;
  patientId: string = '';
  doctorId: string = '';
  isSubmitting = false;
  error: string | null = null;
  recordTypes: { value: MedicalRecordType; label: string }[] = [
    { value: 'ConsultationNote', label: 'Consultation Note' },
    { value: 'LabResult', label: 'Lab Result' },
    { value: 'Prescription', label: 'Prescription' },
    { value: 'ImagingReport', label: 'Imaging Report' },
    { value: 'VaccinationRecord', label: 'Vaccination Record' },
    { value: 'AllergyRecord', label: 'Allergy Record' },
    { value: 'DischargeSummary', label: 'Discharge Summary' },
  ];
  selectedFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private medicalRecordService: MedicalRecordService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.recordForm = this.fb.group({
      recordType: ['ConsultationNote', Validators.required],
      title: ['', Validators.required],
      department: [''],
      summary: [''],
      details: [''],
      recordDate: [new Date().toISOString().split('T')[0], Validators.required],
    });
  }

  ngOnInit(): void {
    // Get patientId from the URL params
    this.route.params.subscribe((params) => {
      this.patientId = params['patientId'];
    }); // Get current doctor's ID
    this.authService.currentUser.subscribe((user: any) => {
      if (user) {
        this.doctorId = user.id;
      }
    });
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  onSubmit(): void {
    if (this.recordForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const newRecord = {
      ...this.recordForm.value,
      patientId: this.patientId,
      doctorId: this.doctorId,
      recordDate: new Date(this.recordForm.value.recordDate),
    };

    this.medicalRecordService
      .createMedicalRecord(newRecord)
      .pipe(
        catchError((err) => {
          this.error = 'Failed to create medical record. Please try again.';
          console.error('Error creating record:', err);
          return of(null);
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe((record) => {
        if (record && this.selectedFiles.length > 0) {
          // Upload attachments
          this.uploadAttachments(record.id);
        } else if (record) {
          // Navigate back to patient's records
          this.router.navigate(['/doctor/patients', this.patientId, 'records']);
        }
      });
  }

  private uploadAttachments(recordId: string): void {
    // Create an array of promises to upload all files
    const uploadPromises = this.selectedFiles.map((file) =>
      this.medicalRecordService.uploadAttachment(recordId, file).toPromise()
    );

    // After all uploads are complete, navigate away
    Promise.all(uploadPromises)
      .then(() => {
        this.router.navigate(['/doctor/patients', this.patientId, 'records']);
      })
      .catch((err) => {
        this.error = 'Some attachments failed to upload.';
        console.error('Error uploading attachments:', err);
      });
  }
}
