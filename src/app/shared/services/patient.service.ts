import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../interfaces/models';

// Response wrapper from Go backend
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Patient extends User {
  // Additional patient-specific fields can go here
  gender?: string;
  // Note: dateOfBirth, phoneNumber (not phone), and address are already in User interface
}

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private apiUrl = `${environment.apiUrl}/api/v1/users`;

  constructor(private http: HttpClient) {}

  // Get all patients for a doctor
  getDoctorPatients(): Observable<Patient[]> {
    return this.http
      .get<ApiResponse<Patient[]>>(`${this.apiUrl}/doctor-patients`)
      .pipe(map((response) => response.data));
  }

  // Get a specific patient by ID
  getPatientById(id: string): Observable<Patient> {
    return this.http
      .get<ApiResponse<Patient>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }
}
