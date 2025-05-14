import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../shared/interfaces/api-response';

/**
 * Base API service that handles common functionality for API calls
 * including unwrapping the standard response format from the Go backend.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  protected apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient) {}

  /**
   * Extracts data from the standard API response format
   *
   * @param response The API response
   * @returns The data from the response
   */
  protected extractData<T>(response: ApiResponse<T>): T {
    console.log('API Response:', response);
    if (response && response.data !== undefined) {
      return response.data;
    }
    // If no data property, just return the response as is
    return response as unknown as T;
  }

  /**
   * Performs a GET request and extracts the data
   *
   * @param endpoint The API endpoint
   * @param options HTTP options
   * @returns An Observable of the extracted data
   */
  protected get<T>(endpoint: string, options = {}): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, options)
      .pipe(map((response) => this.extractData<T>(response)));
  }

  /**
   * Performs a POST request and extracts the data
   *
   * @param endpoint The API endpoint
   * @param body The request body
   * @param options HTTP options
   * @returns An Observable of the extracted data
   */
  protected post<T>(endpoint: string, body: any, options = {}): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body, options)
      .pipe(map((response) => this.extractData<T>(response)));
  }

  /**
   * Performs a PUT request and extracts the data
   *
   * @param endpoint The API endpoint
   * @param body The request body
   * @param options HTTP options
   * @returns An Observable of the extracted data
   */
  protected put<T>(endpoint: string, body: any, options = {}): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body, options)
      .pipe(map((response) => this.extractData<T>(response)));
  }

  /**
   * Performs a PATCH request and extracts the data
   *
   * @param endpoint The API endpoint
   * @param body The request body
   * @param options HTTP options
   * @returns An Observable of the extracted data
   */
  protected patch<T>(endpoint: string, body: any, options = {}): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body, options)
      .pipe(map((response) => this.extractData<T>(response)));
  }

  /**
   * Performs a DELETE request and extracts the data
   *
   * @param endpoint The API endpoint
   * @param options HTTP options
   * @returns An Observable of the extracted data
   */
  protected delete<T>(endpoint: string, options = {}): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, options)
      .pipe(map((response) => this.extractData<T>(response)));
  }
}
