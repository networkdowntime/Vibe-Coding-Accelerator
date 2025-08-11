import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConsistencyCheckRequest {
  projectId: string;
  jobId?: string;
}

export interface ConsistencyCheckResponse {
  success: boolean;
  consistencyJobId: string;
  message: string;
  data: {
    consistencyJobId: string;
    status: string;
    progress: number;
  };
}

export interface ConsistencyCheckStatus {
  consistencyJobId: string;
  status: 'starting' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  results: ConsistencyResult[];
  errors: ConsistencyError[];
  startTime: string;
  endTime?: string;
}

export interface ConsistencyResult {
  filename?: string;
  status: 'corrected' | 'no_corrections_needed' | 'generated';
  corrections?: string[];
  message?: string;
  path?: string;
}

export interface ConsistencyError {
  filename: string;
  error: string;
  timestamp: string;
}

export interface TraceabilityReport {
  content: string;
  path: string;
}

export interface TraceabilityReportMetadata {
  projectId: string;
  completenessScore: number;
  generatedAt: string;
  totalFiles: number;
  processedFiles: number;
}

export interface GenerateReportResponse {
  success: boolean;
  message: string;
  data: {
    reportPath: string;
    content: string;
    metadata: TraceabilityReportMetadata;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TraceabilityService {
  private readonly baseUrl = `${environment.apiUrl}/traceability`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // Subject for tracking active consistency checks
  private activeConsistencyChecks = new BehaviorSubject<Map<string, ConsistencyCheckStatus>>(new Map());
  public activeConsistencyChecks$ = this.activeConsistencyChecks.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Start consistency check on processed files
   */
  startConsistencyCheck(request: ConsistencyCheckRequest): Observable<ConsistencyCheckResponse> {
    return this.http.post<ConsistencyCheckResponse>(
      `${this.baseUrl}/consistency-check`,
      request,
      this.httpOptions
    );
  }

  /**
   * Get consistency check status
   */
  getConsistencyCheckStatus(consistencyJobId: string): Observable<{ success: boolean; data: ConsistencyCheckStatus }> {
    return this.http.get<{ success: boolean; data: ConsistencyCheckStatus }>(
      `${this.baseUrl}/consistency-check/${consistencyJobId}/status`
    );
  }

  /**
   * Generate traceability report
   */
  generateTraceabilityReport(projectId: string): Observable<GenerateReportResponse> {
    return this.http.post<GenerateReportResponse>(
      `${this.baseUrl}/reports/${projectId}/generate`,
      {},
      this.httpOptions
    );
  }

  /**
   * Get traceability report content
   */
  getTraceabilityReport(projectId: string): Observable<{ success: boolean; data: TraceabilityReport }> {
    return this.http.get<{ success: boolean; data: TraceabilityReport }>(
      `${this.baseUrl}/reports/${projectId}`
    );
  }

  /**
   * Download traceability report as Markdown file
   */
  downloadTraceabilityReport(projectId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/reports/${projectId}/download`,
      { responseType: 'blob' }
    );
  }

  /**
   * Track consistency check progress
   */
  trackConsistencyCheck(consistencyJobId: string): void {
    const currentChecks = this.activeConsistencyChecks.value;
    
    // Add initial status
    currentChecks.set(consistencyJobId, {
      consistencyJobId,
      status: 'starting',
      progress: 0,
      results: [],
      errors: [],
      startTime: new Date().toISOString()
    });
    
    this.activeConsistencyChecks.next(new Map(currentChecks));

    // Start polling for status updates
    this.pollConsistencyCheckStatus(consistencyJobId);
  }

  /**
   * Stop tracking consistency check
   */
  stopTrackingConsistencyCheck(consistencyJobId: string): void {
    const currentChecks = this.activeConsistencyChecks.value;
    currentChecks.delete(consistencyJobId);
    this.activeConsistencyChecks.next(new Map(currentChecks));
  }

  /**
   * Get current consistency check status from local state
   */
  getLocalConsistencyCheckStatus(consistencyJobId: string): ConsistencyCheckStatus | undefined {
    return this.activeConsistencyChecks.value.get(consistencyJobId);
  }

  /**
   * Poll consistency check status until completion
   */
  private pollConsistencyCheckStatus(consistencyJobId: string): void {
    const poll = () => {
      this.getConsistencyCheckStatus(consistencyJobId).subscribe({
        next: (response) => {
          if (response.success) {
            const currentChecks = this.activeConsistencyChecks.value;
            currentChecks.set(consistencyJobId, response.data);
            this.activeConsistencyChecks.next(new Map(currentChecks));

            // Continue polling if not finished
            if (response.data.status === 'starting' || response.data.status === 'processing') {
              setTimeout(poll, 2000); // Poll every 2 seconds
            }
          }
        },
        error: (error) => {
          console.error('Error polling consistency check status:', error);
          
          // Update status to error
          const currentChecks = this.activeConsistencyChecks.value;
          const existingStatus = currentChecks.get(consistencyJobId);
          if (existingStatus) {
            existingStatus.status = 'error';
            existingStatus.endTime = new Date().toISOString();
            currentChecks.set(consistencyJobId, existingStatus);
            this.activeConsistencyChecks.next(new Map(currentChecks));
          }
        }
      });
    };

    poll();
  }

  /**
   * Download report file and trigger browser download
   */
  downloadReportFile(projectId: string, fileName?: string): void {
    this.downloadTraceabilityReport(projectId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `${projectId}-traceability-report.md`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading report:', error);
        throw error;
      }
    });
  }

  /**
   * Format consistency check status for display
   */
  formatConsistencyStatus(status: ConsistencyCheckStatus): string {
    switch (status.status) {
      case 'starting':
        return 'Starting consistency check...';
      case 'processing':
        return `Processing... (${status.progress}%)`;
      case 'completed':
        return 'Consistency check completed';
      case 'error':
        return 'Consistency check failed';
      case 'cancelled':
        return 'Consistency check cancelled';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Get consistency check results summary
   */
  getConsistencyResultsSummary(status: ConsistencyCheckStatus): string {
    if (!status.results || status.results.length === 0) {
      return 'No results available';
    }

    const corrected = status.results.filter(r => r.status === 'corrected').length;
    const generated = status.results.filter(r => r.status === 'generated').length;
    const noCorrections = status.results.filter(r => r.status === 'no_corrections_needed').length;

    const parts = [];
    if (corrected > 0) parts.push(`${corrected} file${corrected > 1 ? 's' : ''} corrected`);
    if (generated > 0) parts.push(`${generated} report${generated > 1 ? 's' : ''} generated`);
    if (noCorrections > 0) parts.push('No corrections needed');

    return parts.join(', ') || 'Processing completed';
  }

  /**
   * Check if consistency check can be started for a project
   */
  canStartConsistencyCheck(projectId: string): boolean {
    // Check if there's already an active consistency check for this project
    const activeChecks = this.activeConsistencyChecks.value;
    
    for (const [jobId, status] of activeChecks) {
      if (status.consistencyJobId.includes(projectId) && 
          (status.status === 'starting' || status.status === 'processing')) {
        return false;
      }
    }
    
    return true;
  }
}
