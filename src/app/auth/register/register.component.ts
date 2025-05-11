import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'; // Import ReactiveFormsModule
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service'; // Adjust path as necessary
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-register',
  standalone: true, // Ensure this is true
  imports: [
    CommonModule, // Add CommonModule for *ngIf, etc.
    ReactiveFormsModule, // Add ReactiveFormsModule for formGroup
    RouterLink,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  registrationError: string | null = null; // To display registration errors

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        firstName: ['', Validators.required], // Changed from name to firstName
        lastName: ['', Validators.required], // Added lastName
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validator: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.registrationError = null; // Clear previous errors
      const { firstName, lastName, email, password } = this.registerForm.value;
      this.authService
        .register({ firstName, lastName, email, password })
        .subscribe({
          next: (user) => {
            console.log('Registration successful', user);
            // Navigate to login page after successful registration
            this.router.navigate(['/auth/login']);
            // Optionally, show a success message/toast before navigating
          },
          error: (err) => {
            console.error('Registration failed', err);
            this.registrationError =
              err.message || 'An unknown registration error occurred.';
          },
        });
    }
  }
}
