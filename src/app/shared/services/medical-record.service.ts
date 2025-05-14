import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  MedicalRecord as MedicalRecordBase,
  MedicalRecordAttachment as MedicalRecordAttachmentBase,
} from '../interfaces/models';

// Keep the existing interface for backward compatibility
import {
  MedicalRecord as LegacyMedicalRecord,
  MedicalRecordAttachment as LegacyMedicalRecordAttachment,
  MedicalRecordType,
} from '../interfaces/medical-record.interface';

// Response wrapper from Go backend
interface ApiResponse<T> {
  message: string;
  data: T;
}

// Define the interface for creating/updating records
export interface CreateMedicalRecordDto {
  patientId: string;
  recordType: MedicalRecordType;
  recordDate: string; // ISO date string
  title: string;
  department?: string;
  summary: string;
  details?: string;
}

// Combined interface that works with both legacy code and new backend
export interface MedicalRecord extends MedicalRecordBase {
  // Fields for compatibility with legacy code
  doctorName?: string;
  date?: Date;
}

export interface MedicalRecordAttachment extends MedicalRecordAttachmentBase {
  // Fields for compatibility with legacy code
  fileType?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MedicalRecordService {
  private apiUrl = `${environment.apiUrl}/api/v1/medical-records`;

  constructor(private http: HttpClient) {}

  /**
   * Get all medical records for the current patient
   */
  getPatientRecords(patientId?: string): Observable<MedicalRecord[]> {
    // If patientId is provided, use it; otherwise get records for the logged-in patient
    const url = patientId
      ? `${this.apiUrl}/patient/${patientId}`
      : `${this.apiUrl}/patient`;

    return this.http
      .get<ApiResponse<MedicalRecordBase[]>>(url)
      .pipe(map((response) => this.processMedicalRecords(response.data)));
  }

  /**
   * Get all medical records created by a specific doctor
   */
  getDoctorRecords(doctorId?: string): Observable<MedicalRecord[]> {
    // If doctorId is provided, use it; otherwise get records for the logged-in doctor
    const url = doctorId
      ? `${this.apiUrl}/doctor/${doctorId}`
      : `${this.apiUrl}/doctor`;

    return this.http
      .get<ApiResponse<MedicalRecordBase[]>>(url)
      .pipe(map((response) => this.processMedicalRecords(response.data)));
  }
  /**
   * Process medical records from backend format to frontend format
   * @param records The medical records from the Go backend
   */
  private processMedicalRecords(records: MedicalRecordBase[]): MedicalRecord[] {
    return records.map((record) => {
      // Convert the record to our MedicalRecord interface with legacy compatibility
      return {
        ...record,
        // Add fields needed for legacy compatibility
        date: record.recordDate ? new Date(record.recordDate) : undefined,
        doctorName: 'Doctor', // This would be populated from expanded relations in the real application
        // Process attachments if present
        attachments: record.attachments?.map((attachment) => ({
          ...attachment,
          fileType: attachment.mimeType, // Map mimeType to fileType for legacy code
          url: `${environment.apiUrl}/api/v1/files/${attachment.filePath}`, // Construct URL for attachment
        })),
      };
    });
  }

  /**
   * Process a single medical record
   * @param record The medical record from the Go backend
   */
  private processMedicalRecord(record: MedicalRecordBase): MedicalRecord {
    return this.processMedicalRecords([record])[0];
  }

  /**
   * Get a specific medical record by ID
   */
  getMedicalRecord(id: string): Observable<MedicalRecord> {
    return this.http
      .get<ApiResponse<MedicalRecordBase>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.processMedicalRecord(response.data)));
  }

  /**
   * Create a new medical record
   */
  createMedicalRecord(
    record: CreateMedicalRecordDto
  ): Observable<MedicalRecord> {
    return this.http
      .post<ApiResponse<MedicalRecordBase>>(this.apiUrl, record)
      .pipe(map((response) => this.processMedicalRecord(response.data)));
  }

  /**
   * Update an existing medical record
   */
  updateMedicalRecord(
    id: string,
    record: Partial<CreateMedicalRecordDto>
  ): Observable<MedicalRecord> {
    return this.http
      .patch<ApiResponse<MedicalRecordBase>>(`${this.apiUrl}/${id}`, record)
      .pipe(map((response) => this.processMedicalRecord(response.data)));
  }

  /**
   * Delete a medical record
   */
  deleteMedicalRecord(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => undefined) // Just return void as expected
    );
  }

  /**
   * Upload a file attachment for a medical record
   * @param recordId The ID of the medical record
   * @param file The file to upload
   */
  uploadAttachment(
    recordId: string,
    file: File
  ): Observable<MedicalRecordAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<MedicalRecordAttachmentBase>>(
        `${this.apiUrl}/${recordId}/attachments`,
        formData
      )
      .pipe(
        map((response) => {
          const attachment = response.data;
          return {
            ...attachment,
            fileType: attachment.mimeType,
            url: `${environment.apiUrl}/api/v1/files/${attachment.filePath}`,
          };
        })
      );
  }

  /**
   * Delete an attachment from a medical record
   */
  deleteAttachment(recordId: string, attachmentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${this.apiUrl}/${recordId}/attachments/${attachmentId}`
      )
      .pipe(
        map((response) => undefined) // Just return void as expected
      );
  }

  /**
   * Get all attachments for a medical record
   */
  getAttachments(recordId: string): Observable<MedicalRecordAttachment[]> {
    return this.http
      .get<ApiResponse<MedicalRecordAttachmentBase[]>>(
        `${this.apiUrl}/${recordId}/attachments`
      )
      .pipe(
        map((response) => {
          return response.data.map((attachment) => ({
            ...attachment,
            fileType: attachment.mimeType,
            url: `${environment.apiUrl}/api/v1/files/${attachment.filePath}`,
          }));
        })
      );
  }
}
