import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { PatientService, Patient } from '../../shared/services/patient.service';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.scss'],
})
export class PatientsListComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  searchTerm: string = '';
  constructor(private patientService: PatientService) {}

  // Universal helper function to normalize and simplify strings for searching
  // This works for all languages and character sets by:
  // 1. Converting to lowercase for case-insensitive matching
  // 2. Using a combination of normalization forms to handle all international characters
  normalizeString(str: string): string {
    if (!str) return '';

    // Lowercase first for case insensitivity
    const lowercase = str.toLowerCase();

    // Use standard Unicode normalization to decompose characters
    // NFD decomposes, then we remove all diacritics (the \u0300-\u036f range)
    return lowercase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    console.log('[PatientLoad] Starting to load patients...'); // Log: Start
    this.isLoading = true;
    this.error = null;
    this.patientService
      .getDoctorPatients()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          console.log(
            '[PatientLoad] Finished loading patients (finalize block).'
          ); // Log: Finalize
        }),
        catchError((err) => {
          console.error('[PatientLoad] Error loading patients:', err); // Log: Error
          this.error =
            'Failed to load patients. ' +
            (err.error?.message || 'Please try again later.');
          this.patients = []; // Ensure patients is empty on error
          this.filteredPatients = []; // Ensure filteredPatients is empty on error
          return of([]);
        })
      )
      .subscribe((patients) => {
        console.log('[PatientLoad] Received patients from service:', patients); // Log: Success
        this.patients = patients;
        this.filteredPatients = [...patients];
        console.log(
          '[PatientLoad] Patients array populated. Count:',
          this.patients.length
        ); // Log: Population
        // If search term exists, re-apply search
        if (this.searchTerm && this.searchTerm.trim()) {
          console.log('[PatientLoad] Search term exists, re-applying search.');
          this.onSearch();
        }
      });
  }
  onSearch(): void {
    console.log(
      '[PatientSearch] onSearch triggered. Raw searchTerm:',
      this.searchTerm
    ); // Debug 1

    // Reset the filter if the search term is empty
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredPatients = [...this.patients];
      console.log(
        '[PatientSearch] Search term empty, resetting filter. Patients count:',
        this.patients.length
      ); // Debug 2
      return;
    }

    const term = this.normalizeString(this.searchTerm.trim());
    console.log('[PatientSearch] Normalized search term:', term); // Debug 3

    if (!this.patients || this.patients.length === 0) {
      console.warn(
        '[PatientSearch] No patients loaded to search through. Ensure patients are loaded correctly.'
      ); // Debug 4
      this.filteredPatients = [];
      return;
    }
    console.log(
      '[PatientSearch] Searching through patients. Count:',
      this.patients.length
    );

    this.filteredPatients = this.patients.filter((patient) => {
      if (!patient) return false;

      const normalizedFirstName = this.normalizeString(patient.firstName || '');
      const normalizedLastName = this.normalizeString(patient.lastName || '');
      const normalizedEmail = this.normalizeString(patient.email || '');
      // Consistent normalization for phone number search
      const normalizedPhone = this.normalizeString(patient.phoneNumber || '');

      const fullName = `${normalizedFirstName} ${normalizedLastName}`;
      const reversedName = `${normalizedLastName} ${normalizedFirstName}`;
      const formalName = `${normalizedLastName}, ${normalizedFirstName}`;

      // Use the normalized phone number for matching against the normalized term
      const phoneMatch = normalizedPhone.includes(term);

      const isMatch =
        normalizedFirstName.includes(term) ||
        normalizedLastName.includes(term) ||
        fullName.includes(term) ||
        reversedName.includes(term) ||
        formalName.includes(term) ||
        normalizedEmail.includes(term) ||
        phoneMatch;

      // Uncomment for very detailed per-patient logging if needed:
      // console.log(`[PatientSearch] Checking Patient: ID=${patient.id}, Name=${patient.firstName} ${patient.lastName} (Normalized: ${normalizedFirstName} ${normalizedLastName}), Email: ${normalizedEmail} (Normalized: ${normalizedEmail}), Phone: ${patient.phoneNumber} (Normalized: ${normalizedPhone}). Term: ${term}. Match: ${isMatch}`);

      return isMatch;
    });
    console.log(
      '[PatientSearch] Filtered patients count:',
      this.filteredPatients.length
    ); // Debug 6
    if (this.filteredPatients.length === 0) {
      console.log(
        '[PatientSearch] No patients matched the search term. Original patients list:',
        this.patients
      );
    }
  }
  getPatientAge(dateOfBirth: string | undefined): number {
    if (!dateOfBirth) return 0;

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }
}
