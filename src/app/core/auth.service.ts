import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  private loggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this.loggedIn.asObservable();

  private userRole = new BehaviorSubject<string | null>(null); // 'patient', 'doctor', or null
  public currentUserRole = this.userRole.asObservable();

  constructor(private router: Router) {
    // Check local storage for existing session (dummy implementation)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserSubject.next(user);
      this.loggedIn.next(true);
      this.userRole.next(user.role);
    }
  }

  login(role: 'patient' | 'doctor'): Observable<boolean> {
    // Simulate API call
    const dummyUser = { id: '1', email: role === 'patient' ? 'patient@example.com' : 'doctor@example.com', role: role };
    localStorage.setItem('currentUser', JSON.stringify(dummyUser));
    this.currentUserSubject.next(dummyUser);
    this.loggedIn.next(true);
    this.userRole.next(role);

    if (role === 'patient') {
      this.router.navigate(['/patient/dashboard']);
    } else if (role === 'doctor') {
      this.router.navigate(['/doctor/dashboard']);
    }
    return of(true);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.loggedIn.next(false);
    this.userRole.next(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return this.loggedIn.value;
  }

  hasRole(role: string): boolean {
    return this.userRole.value === role;
  }

  getCurrentUserRole(): string | null {
    return this.userRole.value;
  }
}
