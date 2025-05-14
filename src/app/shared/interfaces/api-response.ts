/**
 * Interface for the standard API response format from the Go backend
 */
export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
  error?: string;
}
