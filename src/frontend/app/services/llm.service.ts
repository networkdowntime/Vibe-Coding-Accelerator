import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, EMPTY, throwError } from 'rxjs';
import { catchError, tap, switchMap, takeWhile, finalize } from 'rxjs/operators';

export interface LLMJobStatus {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    current: string | null;
    percentage: number;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  errors?: Array<{
    file: string;
    error: string;
    timestamp: string;
  }>;
}

export interface LLMJobResult {
  jobId: string;
  projectId: string;
  status: string;
  summary: {
    jobId: string;
    totalFiles: number;
    completedAt: string;
    files: Array<{
      originalPath: string;
      processedPath: string;
      reportPath: string;
      fileName: string;
    }>;
  };
  exportPath: string;
  processedFiles: Array<{
    fileName: string;
    analysis: string;
    suggestions: string[];
    explanation: string;
    processingTime: string;
  }>;
}

export interface ProcessingState {
  isProcessing: boolean;
  currentJob: LLMJobStatus | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private readonly apiUrl = '/api/llm';
  private readonly pollingInterval = 2000; // 2 seconds

  private processingStateSubject = new BehaviorSubject<ProcessingState>({
    isProcessing: false,
    currentJob: null,
    error: null
  });

  public processingState$ = this.processingStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Start LLM processing for a project
   */
  startProcessing(projectId: string): Observable<{ jobId: string; status: string; message: string }> {
    return this.http.post<{ jobId: string; status: string; message: string }>(
      `${this.apiUrl}/process/${projectId}`,
      {}
    ).pipe(
      tap(response => {
        this.updateProcessingState({
          isProcessing: true,
          currentJob: {
            jobId: response.jobId,
            projectId,
            status: 'pending',
            progress: {
              total: 0,
              completed: 0,
              failed: 0,
              current: null,
              percentage: 0
            },
            createdAt: new Date().toISOString()
          },
          error: null
        });

        // Start polling for status updates
        this.startPolling(response.jobId);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get current job status
   */
  getJobStatus(jobId: string): Observable<LLMJobStatus> {
    return this.http.get<LLMJobStatus>(`${this.apiUrl}/status/${jobId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Cancel current processing
   */
  cancelProcessing(jobId: string): Observable<{ jobId: string; status: string; message: string }> {
    return this.http.post<{ jobId: string; status: string; message: string }>(
      `${this.apiUrl}/cancel/${jobId}`,
      {}
    ).pipe(
      tap(() => {
        this.updateProcessingState({
          isProcessing: false,
          currentJob: null,
          error: null
        });
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Retry failed processing
   */
  retryProcessing(jobId: string): Observable<{ jobId: string; status: string; message: string; retryCount: number }> {
    return this.http.post<{ jobId: string; status: string; message: string; retryCount: number }>(
      `${this.apiUrl}/retry/${jobId}`,
      {}
    ).pipe(
      tap(response => {
        this.updateProcessingState({
          isProcessing: true,
          currentJob: {
            ...(this.processingStateSubject.value.currentJob || {} as LLMJobStatus),
            jobId: response.jobId,
            status: 'pending'
          },
          error: null
        });

        // Restart polling
        this.startPolling(response.jobId);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get processing results
   */
  getResults(jobId: string): Observable<LLMJobResult> {
    return this.http.get<LLMJobResult>(`${this.apiUrl}/results/${jobId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Stop any current processing and reset state
   */
  resetProcessing(): void {
    this.updateProcessingState({
      isProcessing: false,
      currentJob: null,
      error: null
    });
  }

  /**
   * Get current processing state
   */
  getCurrentState(): ProcessingState {
    return this.processingStateSubject.value;
  }

  /**
   * Start polling for job status updates
   */
  private startPolling(jobId: string): void {
    timer(0, this.pollingInterval).pipe(
      switchMap(() => this.getJobStatus(jobId)),
      takeWhile(status => 
        status.status === 'pending' || status.status === 'processing',
        true // Include the final emission
      ),
      finalize(() => {
        // Check final status after polling ends
        const currentState = this.processingStateSubject.value;
        if (currentState.currentJob?.status === 'completed' || 
            currentState.currentJob?.status === 'failed' ||
            currentState.currentJob?.status === 'cancelled') {
          this.updateProcessingState({
            ...currentState,
            isProcessing: false
          });
        }
      })
    ).subscribe({
      next: (status) => {
        this.updateProcessingState({
          isProcessing: status.status === 'pending' || status.status === 'processing',
          currentJob: status,
          error: status.error || null
        });
      },
      error: (error) => {
        this.updateProcessingState({
          isProcessing: false,
          currentJob: this.processingStateSubject.value.currentJob,
          error: error.message || 'Failed to get job status'
        });
      }
    });
  }

  /**
   * Update processing state
   */
  private updateProcessingState(state: ProcessingState): void {
    this.processingStateSubject.next(state);
  }

  /**
   * Download AI agent config zip file
   */
  downloadConfig(jobId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${jobId}`, {
      responseType: 'blob'
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.error || `Error ${error.status}: ${error.message}`;
    }

    this.updateProcessingState({
      isProcessing: false,
      currentJob: this.processingStateSubject.value.currentJob,
      error: errorMessage
    });

    console.error('LLM Service Error:', errorMessage);
    throw new Error(errorMessage);
  }
}
