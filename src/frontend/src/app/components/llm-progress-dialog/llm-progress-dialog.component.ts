import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subscription } from 'rxjs';
import { LlmService, LLMStatusResponse } from '../../services/llm.service';

export interface LLMProgressDialogData {
  jobId: string;
  projectName: string;
  totalFiles: number;
}

@Component({
  selector: 'app-llm-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule
  ],
  template: `
    <div class="llm-progress-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon class="processing-icon">auto_fix_high</mat-icon>
        <div class="title-content">
          <h2>LLM Processing</h2>
          <p class="project-name">{{ data.projectName }}</p>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <!-- Status Overview -->
        <mat-card class="status-card">
          <mat-card-content>
            <div class="status-header">
              <div class="status-info">
                <span class="status-label">Status:</span>
                <mat-chip 
                  [class]="'status-chip status-' + (statusData?.data?.status || 'unknown')"
                  [disabled]="false">
                  {{ getStatusDisplayText() }}
                </mat-chip>
              </div>
              <div class="file-count" *ngIf="statusData?.data">
                {{ statusData?.data?.processedFiles || 0 }} / {{ statusData?.data?.totalFiles || 0 }} files
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container">
              <mat-progress-bar 
                mode="determinate" 
                [value]="statusData?.data?.progress || 0"
                [color]="getProgressColor()">
              </mat-progress-bar>
              <span class="progress-text">{{ statusData?.data?.progress || 0 }}%</span>
            </div>

            <!-- Processing Time -->
            <div class="processing-time" *ngIf="statusData?.data?.startTime">
              <mat-icon>schedule</mat-icon>
              <span>Started: {{ formatTime(statusData?.data?.startTime!) }}</span>
              <span *ngIf="statusData?.data?.endTime"> • Completed: {{ formatTime(statusData?.data?.endTime!) }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Results Section (if completed) -->
        <mat-card class="results-card" *ngIf="statusData?.data?.results?.length">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>check_circle</mat-icon>
              Successfully Processed Files ({{ statusData?.data?.results?.length }})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="results-list">
              <div class="result-item" *ngFor="let result of statusData?.data?.results">
                <mat-icon class="result-icon success">description</mat-icon>
                <div class="result-details">
                  <div class="result-name">{{ result.fileName }}</div>
                  <div class="result-path">{{ result.outputPath }}</div>
                </div>
                <mat-chip class="success-chip">Success</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Errors Section (if any) -->
        <mat-card class="errors-card" *ngIf="statusData?.data?.errors?.length">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>error</mat-icon>
              Processing Errors ({{ statusData?.data?.errors?.length }})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-expansion-panel *ngFor="let error of statusData?.data?.errors">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="error-icon">warning</mat-icon>
                  {{ error.fileName }}
                </mat-panel-title>
                <mat-panel-description>
                  {{ formatTime(error.timestamp) }}
                </mat-panel-description>
              </mat-expansion-panel-header>
              <div class="error-details">
                <p><strong>Error:</strong> {{ error.error }}</p>
                <p><strong>File ID:</strong> {{ error.fileId }}</p>
              </div>
            </mat-expansion-panel>
          </mat-card-content>
        </mat-card>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="!statusData && !error">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Loading processing status...</p>
        </div>

        <!-- Error State -->
        <mat-card class="error-card" *ngIf="error">
          <mat-card-content>
            <div class="error-content">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <div>
                <h3>Error Loading Status</h3>
                <p>{{ error }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          color="warn" 
          (click)="cancelProcessing()"
          [disabled]="!canCancel()">
          <mat-icon>cancel</mat-icon>
          Cancel
        </button>
        
        <button 
          mat-raised-button 
          color="primary" 
          (click)="close()"
          [disabled]="!canClose()">
          <mat-icon>{{ getCloseIcon() }}</mat-icon>
          {{ getCloseText() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .llm-progress-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 0;
    }

    .processing-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--mat-primary-color);
    }

    .title-content h2 {
      margin: 0;
      font-size: 24px;
    }

    .project-name {
      margin: 4px 0 0 0;
      color: var(--mat-text-secondary);
      font-size: 14px;
    }

    .dialog-content {
      max-height: 500px;
      overflow-y: auto;
      padding: 20px 0;
    }

    .status-card, .results-card, .errors-card, .error-card {
      margin-bottom: 16px;
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-label {
      font-weight: 500;
    }

    .status-chip {
      font-size: 12px;
      height: 24px;
    }

    .status-chip.status-starting,
    .status-chip.status-processing {
      background-color: #2196f3;
      color: white;
    }

    .status-chip.status-completed {
      background-color: #4caf50;
      color: white;
    }

    .status-chip.status-completed_with_errors {
      background-color: #ff9800;
      color: white;
    }

    .status-chip.status-error {
      background-color: #f44336;
      color: white;
    }

    .status-chip.status-cancelled {
      background-color: #9e9e9e;
      color: white;
    }

    .file-count {
      font-size: 14px;
      color: var(--mat-text-secondary);
    }

    .progress-container {
      position: relative;
      margin-bottom: 16px;
    }

    .progress-text {
      position: absolute;
      right: 0;
      top: -20px;
      font-size: 12px;
      color: var(--mat-text-secondary);
    }

    .processing-time {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--mat-text-secondary);
    }

    .processing-time mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 4px;
      background-color: var(--mat-surface-variant);
    }

    .result-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .result-icon.success {
      color: #4caf50;
    }

    .result-details {
      flex: 1;
    }

    .result-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .result-path {
      font-size: 12px;
      color: var(--mat-text-secondary);
    }

    .success-chip {
      background-color: #4caf50;
      color: white;
      font-size: 11px;
      height: 20px;
    }

    .error-details {
      padding: 12px 0;
    }

    .error-details p {
      margin: 8px 0;
    }

    .error-icon {
      color: #f44336;
      margin-right: 8px;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .error-content mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .loading-state {
      text-align: center;
      padding: 20px;
    }

    .loading-state p {
      margin-top: 16px;
      color: var(--mat-text-secondary);
    }

    .dialog-actions {
      display: flex;
      justify-content: space-between;
      padding: 16px 0 0 0;
      margin-top: 16px;
      border-top: 1px solid var(--mat-divider-color);
    }

    .dialog-actions button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class LlmProgressDialogComponent implements OnInit, OnDestroy {
  statusData: LLMStatusResponse | null = null;
  error: string | null = null;
  private subscription?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<LlmProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LLMProgressDialogData,
    private llmService: LlmService
  ) {}

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private startPolling(): void {
    this.subscription = this.llmService.pollProcessingStatus(this.data.jobId).subscribe({
      next: (response) => {
        this.statusData = response;
        this.error = null;
      },
      error: (error) => {
        console.error('Error polling status:', error);
        this.error = 'Failed to load processing status. Please try again.';
      }
    });
  }

  cancelProcessing(): void {
    if (!this.canCancel()) return;

    this.llmService.cancelProcessing(this.data.jobId).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh status to show cancellation
          this.llmService.getProcessingStatus(this.data.jobId).subscribe({
            next: (statusResponse) => {
              this.statusData = statusResponse;
            },
            error: (error) => {
              console.error('Error refreshing status after cancel:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error cancelling processing:', error);
        this.error = 'Failed to cancel processing. Please try again.';
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.statusData);
  }

  canCancel(): boolean {
    const status = this.statusData?.data?.status;
    return status === 'starting' || status === 'processing';
  }

  canClose(): boolean {
    const status = this.statusData?.data?.status;
    return this.llmService.isJobComplete(status || '');
  }

  getCloseIcon(): string {
    const status = this.statusData?.data?.status;
    if (this.llmService.isJobSuccessful(status || '')) {
      return 'check_circle';
    } else if (this.llmService.isJobFailed(status || '')) {
      return 'error';
    }
    return 'close';
  }

  getCloseText(): string {
    if (!this.canClose()) {
      return 'Processing...';
    }
    
    const status = this.statusData?.data?.status;
    if (this.llmService.isJobSuccessful(status || '')) {
      return 'View Results';
    } else if (this.llmService.isJobFailed(status || '')) {
      return 'Close';
    }
    return 'Close';
  }

  getStatusDisplayText(): string {
    const status = this.statusData?.data?.status || '';
    return this.llmService.getStatusDisplayText(status);
  }

  getProgressColor(): string {
    const status = this.statusData?.data?.status || '';
    const colorMap: { [key: string]: string } = {
      'starting': 'primary',
      'processing': 'primary',
      'completed': 'accent',
      'completed_with_errors': 'warn',
      'error': 'warn',
      'cancelled': 'primary'
    };
    return colorMap[status] || 'primary';
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}
