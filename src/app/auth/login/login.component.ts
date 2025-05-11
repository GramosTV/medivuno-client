import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'; // Import ReactiveFormsModule
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-login',
  standalone: true, // Ensure this is true
  imports: [
    CommonModule, // Add CommonModule for *ngIf, etc.
    ReactiveFormsModule, // Add ReactiveFormsModule for formGroup
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  loginError: string | null = null; // To display login errors

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router // Router might not be strictly needed if AuthService handles all navigation
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loginError = null; // Clear previous errors
      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password }).subscribe({
        next: (isLoggedIn) => {
          if (isLoggedIn) {
            // Navigation is handled by AuthService after successful login and token processing
            // No explicit navigation here is needed as AuthService takes care of it.
            console.log(
              'Login successful, navigation should be handled by AuthService'
            );
          } else {
            // This case might occur if the observable completes with `false`
            // without an error being thrown by `handleError` in AuthService.
            this.loginError = 'Login failed. Please check your credentials.';
            console.error(
              'Login processed but not successful (isLoggedIn is false)'
            );
          }
        },
        error: (err) => {
          console.error('Login failed with error:', err);
          // Attempt to use a more specific error message if available from the error object
          this.loginError =
            err.message || 'An unknown login error occurred. Please try again.';
        },
      });
    } else {
      // Mark all fields as touched to display validation errors if the form is submitted prematurely
      this.loginForm.markAllAsTouched();
    }
  }
}
