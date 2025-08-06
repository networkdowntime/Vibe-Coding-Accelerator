import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface OpenApiSettings {
  endpoint: string;
  hasApiKey: boolean;
  isConfigured: boolean;
}

export interface OpenApiUpdateRequest {
  endpoint: string;
  apiKey: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = 'http://localhost:3001/api/settings';
  private openApiSettingsSubject = new BehaviorSubject<OpenApiSettings | null>(null);
  public openApiSettings$ = this.openApiSettingsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize with default empty settings - load on demand instead of automatically
    this.openApiSettingsSubject.next({
      endpoint: '',
      hasApiKey: false,
      isConfigured: false
    });
  }

  /**
   * Load current OpenAPI settings
   */
  loadOpenApiSettings(): Observable<OpenApiSettings> {
    return new Observable<OpenApiSettings>(observer => {
      this.http.get<OpenApiSettings>(`${this.apiUrl}/openapi`).subscribe({
        next: (settings) => {
          this.openApiSettingsSubject.next(settings);
          observer.next(settings);
          observer.complete();
        },
        error: (error) => {
          console.error('Error loading OpenAPI settings:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Update OpenAPI settings
   */
  updateOpenApiSettings(settings: OpenApiUpdateRequest): Observable<any> {
    return new Observable(observer => {
      this.http.put(`${this.apiUrl}/openapi`, settings).subscribe({
        next: (response: any) => {
          // Update the cached settings
          if (response.settings) {
            this.openApiSettingsSubject.next(response.settings);
          }
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('Error updating OpenAPI settings:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Test OpenAPI connection
   */
  testOpenApiConnection(): Observable<TestConnectionResponse> {
    return this.http.post<TestConnectionResponse>(`${this.apiUrl}/openapi/test`, {});
  }

  /**
   * Get current settings synchronously (from cache)
   */
  getCurrentSettings(): OpenApiSettings | null {
    return this.openApiSettingsSubject.value;
  }

  /**
   * Check if OpenAPI is configured
   */
  isConfigured(): boolean {
    const settings = this.getCurrentSettings();
    return settings ? settings.isConfigured : false;
  }
}
