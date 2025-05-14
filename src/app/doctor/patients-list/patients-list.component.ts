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
    this.isLoading = true;
    this.error = null;
    this.patientService
      .getDoctorPatients()
      .pipe(
        finalize(() => (this.isLoading = false)),
        catchError((err) => {
          this.error =
            'Failed to load patients. ' +
            (err.error?.message || 'Please try again later.');
          return of([]);
        })
      )
      .subscribe((patients) => {
        this.patients = patients;
        this.filteredPatients = [...patients];
      });
  }
  onSearch(): void {
    // Reset the filter if the search term is empty
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredPatients = [...this.patients];
      return;
    }

    const term = this.normalizeString(this.searchTerm.trim());

    this.filteredPatients = this.patients.filter((patient) => {
      if (!patient) return false;

      // Normalize search fields to handle international characters consistently
      const normalizedFirstName = this.normalizeString(patient.firstName || '');
      const normalizedLastName = this.normalizeString(patient.lastName || '');
      const normalizedEmail = this.normalizeString(patient.email || '');

      // Create variations of full names for searching
      const fullName = `${normalizedFirstName} ${normalizedLastName}`;
      const reversedName = `${normalizedLastName} ${normalizedFirstName}`;
      const formalName = `${normalizedLastName}, ${normalizedFirstName}`;

      // Convert phone to string and check if it contains the search term directly
      // Phone numbers shouldn't be normalized as they contain specific formatting
      const phoneMatch =
        patient.phoneNumber?.toLowerCase().includes(term.toLowerCase()) ||
        false;

      // Match if any field contains the search term
      return (
        normalizedFirstName.includes(term) ||
        normalizedLastName.includes(term) ||
        fullName.includes(term) ||
        reversedName.includes(term) ||
        formalName.includes(term) ||
        normalizedEmail.includes(term) ||
        phoneMatch
      );
    }); // If debugging is needed, you can add it here
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
