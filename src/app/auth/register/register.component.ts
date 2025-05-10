import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service'; // Adjust path as necessary
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-register',
  standalone: true, // Ensure this is true
  imports: [
    CommonModule, // Add CommonModule for *ngIf, etc.
    ReactiveFormsModule, // Add ReactiveFormsModule for formGroup
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['patient', Validators.required] // Default role
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { email, role } = this.registerForm.value;
      // In a real app, you would call an AuthService.register() method here.
      // For now, we'll simulate registration by directly logging in.
      this.authService.login(role as 'patient' | 'doctor').subscribe(success => {
        if (success) {
          // Navigation is handled by AuthService upon successful login
          console.log('Registration successful, navigating...');
        } else {
          // Handle registration failure
          console.error('Registration failed');
          this.registerForm.setErrors({ registrationFailed: true });
        }
      });
    }
  }
}
