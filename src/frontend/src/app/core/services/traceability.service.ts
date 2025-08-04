import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TraceabilityReport {
  content: string;
  jobId: string;
}

export interface ReportGenerationResponse {
  success: boolean;
  reportPath: string;
  analysis: any;
  message: string;
}

export interface ConsistencyCheckResponse {
  success: boolean;
  message: string;
  filesUpdated: string[];
  totalFilesChecked: number;
}

@Injectable({
  providedIn: 'root'
})
export class TraceabilityService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/traceability`;

  /**
   * Get existing traceability report
   */
  getReport(jobId: string): Observable<TraceabilityReport> {
    return this.http.get<TraceabilityReport>(`${this.baseUrl}/report/${jobId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Generate new traceability report
   */
  generateReport(jobId: string): Observable<ReportGenerationResponse> {
    return this.http.get<ReportGenerationResponse>(`${this.baseUrl}/report/${jobId}/generate`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get report content (alternative endpoint)
   */
  getReportContent(jobId: string): Observable<TraceabilityReport> {
    return this.http.get<TraceabilityReport>(`${this.baseUrl}/report/${jobId}/content`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Perform consistency check on processed files
   */
  performConsistencyCheck(jobId: string): Observable<ConsistencyCheckResponse> {
    return this.http.post<ConsistencyCheckResponse>(`${this.baseUrl}/consistency/${jobId}`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Download traceability report as Markdown file
   */
  downloadReport(jobId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/report/${jobId}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<Blob>) => {
        if (!response.body) {
          throw new Error('No file content received');
        }
        return response.body;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Unable to connect to server';
      } else if (error.status === 404) {
        errorMessage = 'Report not found';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAPI configuration.';
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }
    }

    console.error('TraceabilityService error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
