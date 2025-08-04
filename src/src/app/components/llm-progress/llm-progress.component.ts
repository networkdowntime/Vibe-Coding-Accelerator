import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LlmService, LLMJobStatus, ProcessingState } from '../../services/llm.service';

@Component({
  selector: 'app-llm-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './llm-progress.component.html',
  styleUrls: ['./llm-progress.component.scss']
})
export class LlmProgressComponent implements OnInit, OnDestroy {
  @Input() projectId: string = '';
  @Input() visible: boolean = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onComplete = new EventEmitter<{ jobId: string; success: boolean }>();
  @Output() onError = new EventEmitter<string>();

  processingState: ProcessingState = {
    isProcessing: false,
    currentJob: null,
    error: null
  };

  showRetryModal: boolean = false;
  showCancelModal: boolean = false;
  showErrorModal: boolean = false;
  errorMessage: string = '';

  private subscription: Subscription = new Subscription();

  constructor(private llmService: LlmService) {}

  ngOnInit(): void {
    // Subscribe to processing state changes
    this.subscription.add(
      this.llmService.processingState$.subscribe(state => {
        this.processingState = state;
        
        // Handle completion
        if (state.currentJob?.status === 'completed') {
          this.onComplete.emit({
            jobId: state.currentJob.jobId,
            success: true
          });
        }
        
        // Handle failure
        if (state.currentJob?.status === 'failed') {
          this.showErrorModal = true;
          this.errorMessage = state.error || 'Processing failed';
          this.onError.emit(this.errorMessage);
        }
        
        // Handle errors
        if (state.error && !state.currentJob) {
          this.showErrorModal = true;
          this.errorMessage = state.error;
          this.onError.emit(this.errorMessage);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Start LLM processing
   */
  startProcessing(): void {
    if (!this.projectId) {
      this.showError('No project selected');
      return;
    }

    this.llmService.startProcessing(this.projectId).subscribe({
      next: (response) => {
        console.log('Processing started:', response);
      },
      error: (error) => {
        this.showError(error.message || 'Failed to start processing');
      }
    });
  }

  /**
   * Cancel processing
   */
  confirmCancel(): void {
    this.showCancelModal = true;
  }

  /**
   * Actually cancel the processing
   */
  cancelProcessing(): void {
    if (this.processingState.currentJob?.jobId) {
      this.llmService.cancelProcessing(this.processingState.currentJob.jobId).subscribe({
        next: () => {
          this.showCancelModal = false;
          this.close();
        },
        error: (error) => {
          this.showError(error.message || 'Failed to cancel processing');
          this.showCancelModal = false;
        }
      });
    }
  }

  /**
   * Retry failed processing
   */
  retryProcessing(): void {
    if (this.processingState.currentJob?.jobId) {
      this.llmService.retryProcessing(this.processingState.currentJob.jobId).subscribe({
        next: () => {
          this.showRetryModal = false;
          this.showErrorModal = false;
        },
        error: (error) => {
          this.showError(error.message || 'Failed to retry processing');
          this.showRetryModal = false;
        }
      });
    }
  }

  /**
   * Close the progress dialog
   */
  close(): void {
    this.llmService.resetProcessing();
    this.onClose.emit();
  }

  /**
   * Show error modal
   */
  private showError(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  /**
   * Close error modal
   */
  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  /**
   * Close retry modal
   */
  closeRetryModal(): void {
    this.showRetryModal = false;
  }

  /**
   * Close cancel modal
   */
  closeCancelModal(): void {
    this.showCancelModal = false;
  }

  /**
   * Show retry modal
   */
  showRetryDialog(): void {
    this.showRetryModal = true;
  }

  /**
   * Get progress bar width percentage
   */
  getProgressWidth(): string {
    return `${this.processingState.currentJob?.progress.percentage || 0}%`;
  }

  /**
   * Get progress text
   */
  getProgressText(): string {
    const job = this.processingState.currentJob;
    if (!job) return '';
    
    const { completed, failed, total, current } = job.progress;
    
    if (job.status === 'pending') {
      return 'Preparing to process files...';
    } else if (job.status === 'processing') {
      if (current) {
        return `Processing ${current} (${completed + failed}/${total})`;
      } else {
        return `Processing files (${completed + failed}/${total})`;
      }
    } else if (job.status === 'completed') {
      return `Completed! Processed ${completed} files successfully`;
    } else if (job.status === 'failed') {
      return `Failed! Processed ${completed} files, ${failed} failed`;
    } else if (job.status === 'cancelled') {
      return 'Processing cancelled';
    }
    
    return '';
  }

  /**
   * Get status icon class
   */
  getStatusIcon(): string {
    const status = this.processingState.currentJob?.status;
    switch (status) {
      case 'pending':
        return 'fas fa-clock';
      case 'processing':
        return 'fas fa-spinner fa-spin';
      case 'completed':
        return 'fas fa-check-circle text-green-500';
      case 'failed':
        return 'fas fa-exclamation-circle text-red-500';
      case 'cancelled':
        return 'fas fa-times-circle text-gray-500';
      default:
        return 'fas fa-question-circle';
    }
  }

  /**
   * Check if can retry
   */
  canRetry(): boolean {
    return this.processingState.currentJob?.status === 'failed';
  }

  /**
   * Check if can cancel
   */
  canCancel(): boolean {
    const status = this.processingState.currentJob?.status;
    return status === 'pending' || status === 'processing';
  }
}
