import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const accessToken = this.authService.getAccessToken();
    const apiUrl = environment.apiUrl;

    // Only add the token for requests to our backend API
    if (req.url.startsWith(apiUrl)) {
      if (accessToken) {
        // Clone the request with the authorization header
        const cloned = this.addToken(req, accessToken);

        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              console.log('401 Unauthorized error for URL:', req.url);
              console.log('Request headers:', req.headers);
              // Token expired, try to refresh
              return this.handle401Error(req, next);
            } else if (error.status === 403) {
              console.error('403 Forbidden error for URL:', req.url);
              console.error('Request details:', {
                method: req.method,
                url: req.url,
                headers: req.headers
                  .keys()
                  .map((key) => `${key}: ${req.headers.get(key)}`),
                body: req.body,
              });
              console.error('Token used:', accessToken);

              // Log user info from token
              try {
                const tokenData = JSON.parse(atob(accessToken.split('.')[1]));
                console.log('Token payload:', tokenData);
              } catch (e) {
                console.error('Could not decode token:', e);
              }

              // Instead of redirecting, just alert the user about permission issue
              alert(
                'You do not have permission to access this resource. Please contact support.'
              );
              // this.authService.redirectToLogin();
            }
            return throwError(() => error);
          })
        );
      } else {
        console.warn(
          `AuthInterceptor: No token available for API request: ${req.url}`
        );
        return next.handle(req);
      }
    } else {
      // For non-API requests
      return next.handle(req);
    }
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`),
      withCredentials: true, // Ensure cookies are sent with the request
    });
  }
  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((token) => {
          console.log('Token refreshed successfully:', token);
          this.refreshTokenSubject.next(token);
          return next.handle(this.addToken(request, token));
        }),
        catchError((err) => {
          // If refresh token fails, logout and redirect to login page
          console.error('Token refresh failed:', err);
          this.authService.logout();
          return throwError(() => err);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    } else {
      // Wait for the token to be refreshed
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          return next.handle(this.addToken(request, token!));
        })
      );
    }
  }
}
