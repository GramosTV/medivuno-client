import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-login',
  standalone: true, // Ensure this is true
  imports: [
    CommonModule, // Add CommonModule for *ngIf, etc.
    ReactiveFormsModule, // Add ReactiveFormsModule for formGroup
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const email = this.loginForm.value.email;
      let role: 'patient' | 'doctor' = 'patient'; 
      if (email.toLowerCase().includes('doctor')) {
        role = 'doctor';
      } else if (email.toLowerCase().includes('patient')) {
        role = 'patient';
      } else {
        // Default or error handling if email doesn't specify role
        // For now, defaulting to patient, or you could show an error
        console.warn('Role not determinable from email, defaulting to patient.');
        role = 'patient';
      }
      this.authService.login(role).subscribe(success => {
        if (success) {
          // Navigation is handled by AuthService
        } else {
          console.error('Login failed');
          // Optionally, set an error message for the form
          this.loginForm.setErrors({ loginFailed: true });
        }
      });
    }
  }
}
