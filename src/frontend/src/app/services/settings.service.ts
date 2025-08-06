import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Settings {
  llmEndpoint: string;
  hasApiKey: boolean;
  isConfigured: boolean;
}

export interface UpdateSettingsRequest {
  llmEndpoint: string;
  llmApiKey: string;
}

export interface TestConnectionRequest {
  llmEndpoint: string;
  llmApiKey: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/settings`;
  
  // Settings state management
  private settingsSubject = new BehaviorSubject<Settings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  /**
   * Get current application settings
   */
  getSettings(): Observable<Settings> {
    return this.http.get<ApiResponse<Settings>>(`${this.apiUrl}`).pipe(
      map(response => {
        if (response.success && response.data) {
          this.settingsSubject.next(response.data);
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to load settings');
        }
      }),
      catchError(error => {
        console.error('Error loading settings:', error);
        // Return default settings if API fails
        const defaultSettings: Settings = {
          llmEndpoint: '',
          hasApiKey: false,
          isConfigured: false
        };
        this.settingsSubject.next(defaultSettings);
        throw error;
      })
    );
  }

  /**
   * Update application settings
   */
  updateSettings(settingsData: UpdateSettingsRequest): Observable<string> {
    return this.http.put<ApiResponse>(`${this.apiUrl}`, settingsData).pipe(
      map(response => {
        if (response.success) {
          // Refresh settings after successful update
          this.getSettings().subscribe();
          return response.message || 'Settings updated successfully';
        } else {
          throw new Error(response.error || 'Failed to update settings');
        }
      }),
      catchError(error => {
        console.error('Error updating settings:', error);
        const errorMessage = error.error?.message || error.message || 'Failed to update settings';
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Test LLM connection
   */
  testConnection(connectionData: TestConnectionRequest): Observable<string> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/test-llm`, connectionData).pipe(
      map(response => {
        if (response.success) {
          return response.message || 'Connection test successful';
        } else {
          throw new Error(response.error || response.message || 'Connection test failed');
        }
      }),
      catchError(error => {
        console.error('Connection test failed:', error);
        let errorMessage = 'Connection test failed';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.details) {
          errorMessage = `${error.error.error || 'Connection failed'}: ${error.error.details}`;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Check if settings are configured
   */
  isConfigured(): Observable<boolean> {
    return this.settings$.pipe(
      map(settings => settings?.isConfigured || false)
    );
  }

  /**
   * Get current settings synchronously (may be null)
   */
  getCurrentSettings(): Settings | null {
    return this.settingsSubject.value;
  }
}
