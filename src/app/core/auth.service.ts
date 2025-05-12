import { Injectable, Injector, NgZone } from '@angular/core'; // Import NgZone
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Keep HttpClient for type usage
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode

// Define a simple interface for the user object we expect after login
// This should be refined based on the actual JWT payload or /me endpoint response
export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'doctor' | 'patient'; // Updated to match expanded Role enum
  firstName: string; // Added to match UserEntity
  lastName: string; // Added to match UserEntity
}

// Interface for the login response from the backend
interface LoginResponse {
  accessToken: string;
  // The backend might also return user details here, or we fetch them separately
  user?: UserProfile; // Optional: if backend sends user details directly
}

// Interface for the registration payload
export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  private loggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this.loggedIn.asObservable();

  private userRole = new BehaviorSubject<string | null>(null);
  public currentUserRole = this.userRole.asObservable();

  private accessToken: string | null = null;

  // Cache the HttpClient instance once resolved
  private _httpClient: HttpClient | undefined;

  constructor(
    private router: Router,
    private injector: Injector,
    private zone: NgZone
  ) {
    // Inject NgZone
    // Defer the call to loadInitialAuthState or ensure HttpClient is accessed lazily
    Promise.resolve().then(() => this.loadInitialAuthState());
  }
  // Lazy load HttpClient
  private get http(): HttpClient {
    if (!this._httpClient) {
      this._httpClient = this.injector.get(HttpClient);
    }
    return this._httpClient;
  }

  // Get user profile from JWT token
  getProfileFromToken(): { id: string; email: string; role: string } | null {
    const token = this.getAccessToken();
    if (token) {
      const decodedToken = this.decodeToken(token);
      if (decodedToken) {
        return {
          id: decodedToken.sub,
          email: decodedToken.email,
          role: decodedToken.role,
        };
      }
    }
    return null;
  }

  private loadInitialAuthState(): void {
    // Attempt to get a new access token on load if refresh token might exist
    // This relies on the browser sending the HttpOnly refresh token cookie
    this.http // Use the getter
      .post<LoginResponse>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      ) // ADDED withCredentials
      .pipe(
        catchError((error) => {
          // If refresh fails (e.g., no valid refresh token), it's fine, user is logged out
          this.clearAuthData();
          return of(null); // Return an observable that completes
        })
      )
      .subscribe((response) => {
        if (response && response.accessToken) {
          this.handleAuthentication(response.accessToken);
        }
      });
  }

  // Modified login to accept credentials
  login(credentials: { email: string; password: string }): Observable<boolean> {
    return this.http // Use the getter
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      }) // ADDED withCredentials
      .pipe(
        tap((response) => {
          if (response && response.accessToken) {
            this.handleAuthentication(response.accessToken);
          } else {
            // Should not happen if backend is correct, but handle defensively
            this.clearAuthData();
            throw new Error('Login failed: No access token received');
          }
        }),
        map((response) => !!response && !!response.accessToken), // Return true on success
        catchError(this.handleError)
      );
  }

  private handleAuthentication(token: string): void {
    this.accessToken = token;
    const decodedToken: any = this.decodeToken(token);

    if (
      decodedToken &&
      decodedToken.role &&
      decodedToken.sub &&
      decodedToken.email
    ) {
      const normalizedRoleFromToken = (
        decodedToken.role as string
      ).toLowerCase() as 'admin' | 'user';

      this.loggedIn.next(true);
      this.userRole.next(normalizedRoleFromToken);
      this.accessToken = token;

      console.log(
        '[AuthService] Token handled, attempting to fetch user profile.'
      );
      this.fetchUserProfile().subscribe({
        next: (profile) => {
          console.log(
            '[AuthService] User profile fetched successfully:',
            profile
          );
          this.zone.run(() => {
            // Run navigation inside NgZone
            if (profile.role === 'user' || profile.role === 'patient') {
              console.log('[AuthService] Navigating to /patient/dashboard');
              this.router.navigate(['/patient/dashboard']);
            } else if (profile.role === 'admin' || profile.role === 'doctor') {
              console.log('[AuthService] Navigating to /doctor/dashboard');
              this.router.navigate(['/doctor/dashboard']);
            } else {
              console.error(
                '[AuthService] Unexpected user role after profile fetch:',
                profile.role
              );
              this.clearAuthDataAndNavigate();
            }
          });
        },
        error: (err) => {
          console.error(
            '[AuthService] Failed to fetch user profile, navigation aborted:',
            err.message
          );
          this.clearAuthDataAndNavigate();
        },
      });
    } else {
      console.error(
        '[AuthService] Failed to decode token or essential claims missing.'
      );
      this.clearAuthDataAndNavigate();
    }
  }

  // JWT decoding logic using jwt-decode
  private decodeToken(token: string): any | null {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  logout(): void {
    this.http // Use the getter
      .delete(`${this.apiUrl}/auth/logout`, { withCredentials: true }) // Ensure cookies are sent
      .pipe(
        tap(() => this.clearAuthDataAndNavigate()),
        catchError((error) => {
          console.error(
            'Logout failed on backend, clearing local auth data anyway',
            error
          );
          this.clearAuthDataAndNavigate(); // Clear local data even if backend call fails
          return of(null); // Continue
        })
      )
      .subscribe();
  }

  private clearAuthData(): void {
    this.accessToken = null;
    this.currentUserSubject.next(null);
    this.loggedIn.next(false);
    this.userRole.next(null);
  }

  private clearAuthDataAndNavigate(): void {
    // Clear auth data
    this.clearAuthData();

    // Navigate to login page outside Angular zone to prevent ExpressionChangedAfterItHasBeenCheckedError
    this.zone.run(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  public getAccessToken(): string | null {
    return this.accessToken;
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

  // Get current user profile (safe accessor method)
  getCurrentUserProfile(): UserProfile | null {
    // Return a cached copy of the user profile if available
    const userProfileJSON = sessionStorage.getItem('healthcare_user_profile');
    if (userProfileJSON) {
      try {
        return JSON.parse(userProfileJSON);
      } catch (e) {
        console.error('Failed to parse user profile from session storage:', e);
      }
    }
    return null;
  }

  // Method to update the current user profile in session storage
  private updateUserProfileCache(profile: UserProfile): void {
    if (profile) {
      sessionStorage.setItem(
        'healthcare_user_profile',
        JSON.stringify(profile)
      );
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (
        error.error &&
        typeof error.error === 'object' &&
        error.error.message
      ) {
        errorMessage += `\nServer Message: ${error.error.message}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Implement registration method
  register(userData: CreateUserPayload): Observable<UserProfile> {
    return this.http // Use the getter
      .post<UserProfile>(`${this.apiUrl}/users`, userData) // Backend returns UserEntity, matching UserProfile
      .pipe(
        tap((registeredUser) => {
          console.log('Registration successful, user data:', registeredUser);
          // Note: This does not automatically log the user in. They will need to login separately.
        }),
        catchError(this.handleError)
      );
  }

  fetchUserProfile(): Observable<UserProfile> {
    if (!this.getAccessToken()) {
      console.warn(
        'fetchUserProfile called without an access token. Logging out.'
      );
      this.clearAuthDataAndNavigate();
      return throwError(
        () =>
          new Error('Attempted to fetch user profile without an access token.')
      );
    }

    // Expecting backend to return UserProfile like structure but role might be uppercase
    return this.http.get<any>(`${this.apiUrl}/users/me`).pipe(
      map((backendUser) => {
        // Explicitly map to UserProfile and normalize the role to lowercase
        const userProfile: UserProfile = {
          id: backendUser.id,
          email: backendUser.email,
          firstName: backendUser.firstName,
          lastName: backendUser.lastName,
          role: (backendUser.role as string).toLowerCase() as
            | 'admin'
            | 'user'
            | 'doctor'
            | 'patient',
        };
        return userProfile;
      }),
      tap((user: UserProfile) => {
        // user is now correctly typed UserProfile with lowercase role
        this.currentUserSubject.next(user);
        this.userRole.next(user.role);
        if (!this.loggedIn.value) {
          this.loggedIn.next(true);
        }
        console.log(
          'User profile updated from /users/me (role normalized):',
          user
        );
      }),
      catchError((err) => {
        console.error(
          'Error fetching user profile from /users/me. Logging out.',
          err
        );
        this.clearAuthDataAndNavigate();
        return throwError(
          () =>
            new Error(
              `Failed to fetch user profile from /users/me. User logged out. Original error: ${
                err.message || 'Unknown error'
              }`
            )
        );
      })
    );
  }
}
