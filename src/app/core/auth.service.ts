import { Injectable, NgZone, Inject, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

// Import shared interfaces from models.ts
import {
  User,
  UserRole,
  LoginResponse,
  RefreshTokenResponse,
} from '../shared/interfaces/models';

// Define a local alias for UserProfile to maintain compatibility with existing code
export type UserProfile = User;

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
  private httpClient = inject(HttpClient);

  constructor(private router: Router, private zone: NgZone) {
    // Defer the call to loadInitialAuthState
    Promise.resolve().then(() => this.loadInitialAuthState());
  }

  // Getter for http client
  private get http(): HttpClient {
    return this.httpClient;
  }
  // Get user profile from JWT token
  getProfileFromToken(): { id: string; email: string; role: string } | null {
    const token = this.getAccessToken();
    if (token) {
      const decodedToken = this.decodeToken(token);
      if (decodedToken) {
        // Support both token formats: Go backend uses user_id, while standard JWT uses sub
        const userId = decodedToken.user_id || decodedToken.sub;

        return {
          id: userId,
          email: decodedToken.email || '',
          role: decodedToken.role,
        };
      }
    }
    return null;
  }
  private loadInitialAuthState(): void {
    // Get stored refresh token if available
    const refreshToken = localStorage.getItem('refresh_token');

    // Check if we have a refresh token in localStorage
    // If not, the server might still have an HTTP-only cookie
    if (!refreshToken) {
      console.log(
        'No local refresh token found, checking cookie via server request'
      );
      // Make a request with withCredentials to check for HTTP-only cookie
    } else {
      console.log('Found local refresh token, using for refresh');
    }

    // Attempt to get a new access token
    // withCredentials: true will include any HTTP-only cookies
    this.http // Use the getter
      .post<any>(
        `${this.apiUrl}/api/v1/auth/refresh-token`,
        refreshToken ? { refreshToken } : {}, // Only include token in body if it exists
        { withCredentials: true }
      )
      .pipe(
        catchError((error) => {
          console.error('Token refresh failed:', error);
          // If refresh fails, the user needs to log in again
          this.clearAuthData();
          return of(null); // Return an observable that completes
        })
      )
      .subscribe((response) => {
        if (response && response.data && response.data.accessToken) {
          console.log('Successfully refreshed access token');

          // Store the new refresh token if provided
          if (response.data.refreshToken) {
            localStorage.setItem('refresh_token', response.data.refreshToken);
          }

          this.handleAuthentication(response.data.accessToken);
        } else {
          console.error(
            'Token refresh response did not contain an access token:',
            response
          );
          this.clearAuthData();
        }
      });
  } // Modified login to accept credentials and work with Go backend
  login(credentials: { email: string; password: string }): Observable<boolean> {
    return this.http // Use the getter
      .post<any>(`${this.apiUrl}/api/v1/auth/login`, credentials, {
        withCredentials: true,
      }) // ADDED withCredentials
      .pipe(
        tap((response) => {
          console.log('Login response:', response);

          // Handle Go backend's response structure: { status, message, data }
          const loginData = response.data;

          if (loginData && loginData.accessToken) {
            // Store the refresh token if available (for client-side refresh logic and backward compatibility)
            // In the improved system, the token is primarily stored as HTTP-only cookie
            if (loginData.refreshToken) {
              localStorage.setItem('refresh_token', loginData.refreshToken);
              console.log(
                'Stored refresh token in localStorage for backward compatibility'
              );
            }

            // The user object should be included in the response from Go backend
            if (loginData.user) {
              // Normalize the role to lowercase if it's uppercase from backend
              const user = { ...loginData.user };
              if (user.role) {
                // Convert to lowercase
                let role = user.role.toLowerCase();

                // For backend compatibility: 'user' role should be treated as 'patient'
                if (role === 'user') {
                  role = 'patient';
                  console.log(
                    '[AuthService] Converting "user" role to "patient" for backend compatibility'
                  );
                }

                user.role = role as UserRole;
              }

              // Update the user in state
              this.currentUserSubject.next(user);
              this.updateUserProfileCache(user);
            }

            this.handleAuthentication(loginData.accessToken);
          } else {
            // Should not happen if backend is correct, but handle defensively
            this.clearAuthData();
            throw new Error('Login failed: No access token received');
          }
        }),
        map(
          (response) =>
            !!response && !!response.data && !!response.data.accessToken
        ), // Return true on success
        catchError(this.handleError)
      );
  }
  private handleAuthentication(token: string): void {
    this.accessToken = token;
    // Store token in session storage for persistence across page reloads
    sessionStorage.setItem('access_token', token);

    const decodedToken: any = this.decodeToken(token);
    console.log('Decoded token:', decodedToken);

    // Support both token formats: Go backend uses user_id, while standard JWT uses sub
    const userId = decodedToken?.user_id || decodedToken?.sub;
    if (decodedToken && decodedToken.role && userId) {
      // Get the role from the token and convert to lowercase
      let normalizedRoleFromToken = (decodedToken.role as string).toLowerCase();

      // For backend compatibility: 'user' role in the frontend should be treated as 'patient'
      // This ensures the role aligns with what the backend expects for authorization
      if (normalizedRoleFromToken === 'user') {
        normalizedRoleFromToken = 'patient';
        console.log(
          '[AuthService] Converting "user" role to "patient" for backend compatibility'
        );
      }

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
      const decoded = jwtDecode(token);
      console.log(
        'Successfully decoded token structure:',
        Object.keys(decoded)
      );
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      console.error(
        'Token value that failed to decode:',
        token.substring(0, 20) + '...'
      );
      return null;
    }
  }
  logout(): void {
    // Get the refresh token for logout (from localStorage for backward compatibility)
    const refreshToken = localStorage.getItem('refresh_token');

    // Call the Go backend logout endpoint
    // The withCredentials: true will send the HTTP-only cookie if it exists
    this.http
      .post(
        `${this.apiUrl}/api/v1/auth/logout`,
        { refreshToken }, // Include the token in body for backward compatibility
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          // Always clear local storage refresh token
          localStorage.removeItem('refresh_token');
          console.log('Removed refresh token from localStorage');
          this.clearAuthDataAndNavigate();
        }),
        catchError((error) => {
          console.error(
            'Logout failed on backend, clearing local auth data anyway',
            error
          );
          // Still remove the refresh token and clear auth data
          localStorage.removeItem('refresh_token');
          this.clearAuthDataAndNavigate();
          return of(null);
        })
      )
      .subscribe();
  }
  private clearAuthData(): void {
    this.accessToken = null;
    sessionStorage.removeItem('access_token');
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
    // First check the in-memory state
    if (this.accessToken) {
      return this.accessToken;
    }

    // If not found in memory, try to get it from session storage
    const token = sessionStorage.getItem('access_token');

    // If we found it in storage but not in memory, update memory
    if (token && !this.accessToken) {
      this.accessToken = token;
      console.log('[AuthService] Restored access token from session storage');
    }

    return token;
  }
  isAuthenticated(): boolean {
    // First check BehaviorSubject
    if (this.loggedIn.value) {
      return true;
    }
    // If not authenticated in memory, check storage for tokens
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = sessionStorage.getItem('access_token');

    // If we have a token, consider the user authenticated
    const hasToken = !!refreshToken || !!accessToken;

    // If we have a token but the loggedIn state is false, fix it
    if (hasToken && !this.loggedIn.value) {
      console.log(
        'Token exists but loggedIn state is false, restoring authenticated state'
      );
      this.loggedIn.next(true);

      // If we have an access token but it's not in memory, restore it
      if (accessToken && !this.accessToken) {
        this.accessToken = accessToken;

        // Also restore the user role from the token
        const decodedToken: any = this.decodeToken(accessToken);
        if (decodedToken && decodedToken.role) {
          let role = (decodedToken.role as string).toLowerCase();

          // Normalize roles for consistency
          if (role === 'user') {
            role = 'patient';
          }

          this.userRole.next(role);
          console.log('[AuthService] Restored user role from token:', role);
        }
      }
    }

    return hasToken;
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

  // Add this method for AuthInterceptor
  redirectToLogin(): void {
    // Clear authentication data
    this.clearAuthData();
    // Navigate to login page
    this.zone.run(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  // Add this method for AuthInterceptor
  refreshToken(): Observable<string> {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<any>(
        `${this.apiUrl}/api/v1/auth/refresh-token`,
        { refreshToken },
        { withCredentials: true }
      )
      .pipe(
        map((response) => {
          console.log('Refresh token response:', response);
          // Handle Go backend's response structure: { status, message, data }
          const refreshData = response.data;

          if (refreshData && refreshData.accessToken) {
            console.log('Access token refreshed successfully');
            // Store the new refresh token if provided
            if (refreshData.refreshToken) {
              localStorage.setItem('refresh_token', refreshData.refreshToken);
            } // Store token in memory and session storage
            this.accessToken = refreshData.accessToken;
            sessionStorage.setItem('access_token', refreshData.accessToken);

            // Update role from token if available
            const decodedToken = this.decodeToken(refreshData.accessToken);
            if (decodedToken && decodedToken.role) {
              let role = (decodedToken.role as string).toLowerCase();

              // For backend compatibility: 'user' role should be treated as 'patient'
              if (role === 'user') {
                role = 'patient';
                console.log(
                  '[AuthService] Converting "user" role to "patient" after token refresh'
                );
              }

              // Update the role in the application state
              this.userRole.next(role);
            }

            return refreshData.accessToken;
          } else {
            throw new Error('No access token received during refresh');
          }
        }),
        catchError((error) => {
          console.error('Token refresh error', error);
          this.clearAuthData();
          return throwError(() => error);
        })
      );
  }
  // Implement registration method for Go backend
  register(userData: CreateUserPayload): Observable<UserProfile> {
    // Convert the userData to what the Go backend expects
    const registerRequest = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      // Default to PATIENT role for frontend registration
      role: 'PATIENT',
    };

    return this.http
      .post<any>(`${this.apiUrl}/api/v1/auth/register`, registerRequest)
      .pipe(
        map((response) => {
          // The response might contain the data object or be the user directly
          const user = response.data || response;
          console.log('Registration successful, user data:', user);
          return user as UserProfile;
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

    // The Go backend endpoint for user profile
    return this.http
      .get<any>(`${this.apiUrl}/api/v1/auth/profile`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          // The response may include a data property containing the user
          const backendUser = response.data || response; // Explicitly map to UserProfile and normalize the role to lowercase
          let normalizedRole = (backendUser.role as string).toLowerCase();

          // For backend compatibility: 'user' role should be treated as 'patient'
          if (normalizedRole === 'user') {
            normalizedRole = 'patient';
            console.log(
              '[AuthService] Converting "user" role to "patient" for backend compatibility in profile fetch'
            );
          }

          const userProfile: UserProfile = {
            id: backendUser.id,
            email: backendUser.email,
            firstName: backendUser.firstName,
            lastName: backendUser.lastName,
            role: normalizedRole as UserRole,
            // Add optional fields if they exist in the response
            dateOfBirth: backendUser.dateOfBirth,
            phoneNumber: backendUser.phoneNumber,
            address: backendUser.address,
            profileImage: backendUser.profileImage,
            isVerified: backendUser.isVerified,
            createdAt: backendUser.createdAt,
            updatedAt: backendUser.updatedAt,
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
            'User profile updated from Go backend (role normalized):',
            user
          );

          // Cache the user profile
          this.updateUserProfileCache(user);
        }),
        catchError((err) => {
          console.error(
            'Error fetching user profile from Go backend. Logging out.',
            err
          );
          this.clearAuthDataAndNavigate();
          return throwError(
            () =>
              new Error(
                `Failed to fetch user profile. User logged out. Original error: ${
                  err.message || 'Unknown error'
                }`
              )
          );
        })
      );
  }
}
