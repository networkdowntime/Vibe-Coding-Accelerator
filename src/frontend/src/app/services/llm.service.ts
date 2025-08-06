import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LLMProcessingRequest {
  projectId: string;
  fileIds: string[];
  aiAgentConfig: any;
}

export interface LLMProcessingResponse {
  success: boolean;
  jobId: string;
  message: string;
  data: {
    jobId: string;
    status: string;
    progress: number;
    totalFiles: number;
  };
}

export interface LLMStatusResponse {
  success: boolean;
  data: {
    jobId: string;
    status: 'starting' | 'processing' | 'completed' | 'completed_with_errors' | 'error' | 'cancelled';
    progress: number;
    totalFiles: number;
    processedFiles: number;
    results: Array<{
      fileId: string;
      fileName: string;
      outputPath: string;
      status: string;
      processedAt: string;
    }>;
    errors: Array<{
      fileId: string;
      fileName: string;
      error: string;
      timestamp: string;
    }>;
    startTime: string;
    endTime?: string;
  };
}

export interface LLMCancelResponse {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    status: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private readonly baseUrl = `${environment.apiUrl}/llm`;

  constructor(private http: HttpClient) {}

  /**
   * Start LLM processing for project files
   */
  processFiles(request: LLMProcessingRequest): Observable<LLMProcessingResponse> {
    return this.http.post<LLMProcessingResponse>(`${this.baseUrl}/process`, request);
  }

  /**
   * Get processing status for a job
   */
  getProcessingStatus(jobId: string): Observable<LLMStatusResponse> {
    return this.http.get<LLMStatusResponse>(`${this.baseUrl}/status/${jobId}`);
  }

  /**
   * Cancel processing for a job
   */
  cancelProcessing(jobId: string): Observable<LLMCancelResponse> {
    return this.http.post<LLMCancelResponse>(`${this.baseUrl}/cancel/${jobId}`, {});
  }

  /**
   * Poll for processing status updates
   * Returns an observable that emits status updates until processing is complete
   */
  pollProcessingStatus(jobId: string, pollInterval: number = 2000): Observable<LLMStatusResponse> {
    return interval(pollInterval).pipe(
      switchMap(() => this.getProcessingStatus(jobId)),
      takeWhile((response) => {
        const status = response.data?.status;
        return status === 'starting' || status === 'processing';
      }, true), // Include the final emission
      shareReplay(1)
    );
  }

  /**
   * Check if a job status indicates completion (success or failure)
   */
  isJobComplete(status: string): boolean {
    return ['completed', 'completed_with_errors', 'error', 'cancelled'].includes(status);
  }

  /**
   * Check if a job status indicates success
   */
  isJobSuccessful(status: string): boolean {
    return status === 'completed' || status === 'completed_with_errors';
  }

  /**
   * Check if a job status indicates an error
   */
  isJobFailed(status: string): boolean {
    return status === 'error';
  }

  /**
   * Check if a job is running
   */
  isJobRunning(status: string): boolean {
    return status === 'starting' || status === 'processing';
  }

  /**
   * Get status display text for UI
   */
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'starting':
        return 'Starting...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed Successfully';
      case 'completed_with_errors':
        return 'Completed with Errors';
      case 'error':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown Status';
    }
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'starting':
      case 'processing':
        return 'primary';
      case 'completed':
        return 'success';
      case 'completed_with_errors':
        return 'warning';
      case 'error':
        return 'danger';
      case 'cancelled':
        return 'medium';
      default:
        return 'medium';
    }
  }
}
