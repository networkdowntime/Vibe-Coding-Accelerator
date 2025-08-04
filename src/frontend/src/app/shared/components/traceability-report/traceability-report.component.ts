import { Component, OnInit, Input, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil, finalize } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { TraceabilityService } from '../../../core/services/traceability.service';

export interface TraceabilityReport {
  content: string;
  jobId: string;
}

@Component({
  selector: 'app-traceability-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  template: `
    <div class="traceability-report-container">
      <!-- Header -->
      <mat-card class="report-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>analytics</mat-icon>
            Traceability Report
          </mat-card-title>
          <mat-card-subtitle *ngIf="jobId()">
            Job ID: {{ jobId() }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <button 
            mat-raised-button 
            color="primary" 
            (click)="generateReport()"
            [disabled]="isGenerating()"
            *ngIf="!reportContent() && jobId()">
            <mat-icon>create</mat-icon>
            Generate Report
          </button>
          
          <button 
            mat-raised-button 
            color="primary" 
            (click)="performConsistencyCheck()"
            [disabled]="isPerformingConsistency()"
            *ngIf="jobId()">
            <mat-icon>fact_check</mat-icon>
            Run Consistency Check
          </button>
          
          <button 
            mat-stroked-button 
            (click)="downloadReport()"
            [disabled]="!reportContent() || isDownloading()"
            *ngIf="reportContent()">
            <mat-icon>download</mat-icon>
            Download Report
          </button>
          
          <button 
            mat-stroked-button 
            (click)="refreshReport()"
            [disabled]="isLoading()"
            *ngIf="reportContent()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Loading States -->
      <mat-card *ngIf="isLoading() && !reportContent()" class="loading-card">
        <mat-card-content class="loading-content">
          <mat-spinner diameter="50"></mat-spinner>
          <p>{{ loadingMessage() }}</p>
        </mat-card-content>
      </mat-card>

      <!-- Consistency Check Status -->
      <mat-card *ngIf="consistencyResult()" class="consistency-status-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon [color]="consistencyResult()?.success ? 'primary' : 'warn'">
              {{ consistencyResult()?.success ? 'check_circle' : 'error' }}
            </mat-icon>
            Consistency Check Results
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>{{ consistencyResult()?.message }}</p>
          <div *ngIf="consistencyResult()?.filesUpdated?.length > 0">
            <p><strong>Files Updated:</strong></p>
            <mat-chip-set>
              <mat-chip *ngFor="let file of consistencyResult()?.filesUpdated">
                {{ file }}
              </mat-chip>
            </mat-chip-set>
          </div>
          <p *ngIf="consistencyResult()?.totalFilesChecked">
            <strong>Total Files Checked:</strong> {{ consistencyResult()?.totalFilesChecked }}
          </p>
        </mat-card-content>
      </mat-card>

      <!-- Error Display -->
      <mat-card *ngIf="error()" class="error-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon color="warn">error</mat-icon>
            Error
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>{{ error() }}</p>
          <button mat-button (click)="clearError()" color="primary">
            Dismiss
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Report Content -->
      <mat-card *ngIf="reportContent() && !isLoading()" class="report-content-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>description</mat-icon>
            Report Content
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="markdown-container">
            <div 
              class="report-content"
              [innerHTML]="sanitizedReportContent()">
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Empty State -->
      <mat-card *ngIf="!reportContent() && !isLoading() && !error()" class="empty-state-card">
        <mat-card-content class="empty-state-content">
          <mat-icon class="empty-state-icon">analytics</mat-icon>
          <h3>No Traceability Report Available</h3>
          <p *ngIf="!jobId()">Please provide a valid job ID to generate a traceability report.</p>
          <p *ngIf="jobId()">Click "Generate Report" to create a new traceability report for this job.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .traceability-report-container {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-header {
      margin-bottom: 16px;
    }

    .report-header mat-card-header {
      margin-bottom: 16px;
    }

    .report-header mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .report-header mat-card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .loading-card,
    .consistency-status-card,
    .error-card,
    .report-content-card,
    .empty-state-card {
      margin-bottom: 16px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      text-align: center;
    }

    .loading-content mat-spinner {
      margin-bottom: 16px;
    }

    .consistency-status-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .consistency-status-card mat-chip-set {
      margin-top: 8px;
    }

    .error-card {
      border-left: 4px solid #f44336;
    }

    .error-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
    }

    .report-content-card {
      margin-bottom: 32px;
    }

    .report-content-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .markdown-container {
      max-width: 100%;
      overflow-x: auto;
    }

    .markdown-container ::ng-deep h1,
    .markdown-container ::ng-deep h2,
    .markdown-container ::ng-deep h3 {
      color: #1976d2;
      margin-top: 24px;
      margin-bottom: 16px;
    }

    .markdown-container ::ng-deep h1:first-child {
      margin-top: 0;
    }

    .markdown-container ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    .markdown-container ::ng-deep table th,
    .markdown-container ::ng-deep table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }

    .markdown-container ::ng-deep table th {
      background-color: #f5f5f5;
      font-weight: 600;
    }

    .markdown-container ::ng-deep code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }

    .markdown-container ::ng-deep pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 16px 0;
    }

    .markdown-container ::ng-deep blockquote {
      border-left: 4px solid #ddd;
      margin: 16px 0;
      padding-left: 16px;
      font-style: italic;
    }

    .markdown-container ::ng-deep .mermaid {
      text-align: center;
      margin: 24px 0;
    }

    .empty-state-card {
      margin-top: 32px;
    }

    .empty-state-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 32px;
      text-align: center;
    }

    .empty-state-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state-content h3 {
      margin: 0 0 16px 0;
      color: #666;
    }

    .empty-state-content p {
      margin: 0;
      color: #999;
      max-width: 400px;
    }

    @media (max-width: 768px) {
      .traceability-report-container {
        padding: 8px;
      }
      
      .report-header mat-card-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .report-header mat-card-actions button {
        width: 100%;
        margin-bottom: 8px;
      }
      
      .markdown-container ::ng-deep table {
        font-size: 14px;
      }
    }
  `]
})
export class TraceabilityReportComponent implements OnInit, OnDestroy {
  @Input() set jobIdInput(value: string | null) {
    if (value) {
      this.jobId.set(value);
      this.loadExistingReport();
    }
  }

  // Injected services
  private traceabilityService = inject(TraceabilityService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  // Signals for reactive state management
  jobId = signal<string | null>(null);
  reportContent = signal<string | null>(null);
  error = signal<string | null>(null);
  isGenerating = signal<boolean>(false);
  isPerformingConsistency = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  isLoadingExisting = signal<boolean>(false);
  consistencyResult = signal<any>(null);

  // Computed signals
  isLoading = computed(() => 
    this.isGenerating() || 
    this.isPerformingConsistency() || 
    this.isLoadingExisting()
  );

  loadingMessage = computed(() => {
    if (this.isGenerating()) return 'Generating traceability report...';
    if (this.isPerformingConsistency()) return 'Performing consistency check...';
    if (this.isLoadingExisting()) return 'Loading existing report...';
    return 'Loading...';
  });

  sanitizedReportContent = computed(() => {
    const content = this.reportContent();
    if (!content) return null;
    // Convert basic Markdown to HTML
    const htmlContent = this.convertMarkdownToHtml(content);
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  });

  // Component lifecycle
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Component initialization handled by input setter
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Convert basic Markdown to HTML
   */
  private convertMarkdownToHtml(markdown: string): string {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
    
    // Tables
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim());
      const cellTags = cells.map((cell: string) => `<td>${cell}</td>`).join('');
      return `<tr>${cellTags}</tr>`;
    });
    
    // Wrap tables
    html = html.replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');
    
    // Line breaks
    html = html.replace(/\n/gim, '<br>');
    
    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    return html;
  }

  /**
   * Load existing report if available
   */
  private loadExistingReport(): void {
    const currentJobId = this.jobId();
    if (!currentJobId) return;

    this.isLoadingExisting.set(true);
    this.error.set(null);

    this.traceabilityService.getReport(currentJobId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingExisting.set(false))
      )
      .subscribe({
        next: (report) => {
          this.reportContent.set(report.content);
        },
        error: (error) => {
          // Don't show error for missing report - this is expected for new jobs
          if (error.status !== 404) {
            this.error.set('Failed to load existing report: ' + error.message);
          }
        }
      });
  }

  /**
   * Generate a new traceability report
   */
  generateReport(): void {
    const currentJobId = this.jobId();
    if (!currentJobId) {
      this.error.set('Job ID is required to generate report');
      return;
    }

    this.isGenerating.set(true);
    this.error.set(null);
    this.consistencyResult.set(null);

    this.traceabilityService.generateReport(currentJobId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isGenerating.set(false))
      )
      .subscribe({
        next: (response) => {
          this.snackBar.open('Traceability report generated successfully', 'Close', {
            duration: 3000
          });
          // Load the generated report
          this.loadExistingReport();
        },
        error: (error) => {
          this.error.set('Failed to generate report: ' + error.message);
        }
      });
  }

  /**
   * Perform consistency check on processed files
   */
  performConsistencyCheck(): void {
    const currentJobId = this.jobId();
    if (!currentJobId) {
      this.error.set('Job ID is required to perform consistency check');
      return;
    }

    this.isPerformingConsistency.set(true);
    this.error.set(null);

    this.traceabilityService.performConsistencyCheck(currentJobId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isPerformingConsistency.set(false))
      )
      .subscribe({
        next: (result) => {
          this.consistencyResult.set(result);
          this.snackBar.open('Consistency check completed', 'Close', {
            duration: 3000
          });
          // Regenerate report after consistency check
          if (this.reportContent()) {
            setTimeout(() => this.generateReport(), 1000);
          }
        },
        error: (error) => {
          this.error.set('Failed to perform consistency check: ' + error.message);
        }
      });
  }

  /**
   * Download the traceability report as a Markdown file
   */
  downloadReport(): void {
    const currentJobId = this.jobId();
    if (!currentJobId) {
      this.error.set('Job ID is required to download report');
      return;
    }

    this.isDownloading.set(true);
    this.error.set(null);

    this.traceabilityService.downloadReport(currentJobId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isDownloading.set(false))
      )
      .subscribe({
        next: (blob) => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `traceability-report-${currentJobId}.md`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.snackBar.open('Report downloaded successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.error.set('Failed to download report: ' + error.message);
        }
      });
  }

  /**
   * Refresh the current report
   */
  refreshReport(): void {
    if (this.reportContent()) {
      this.loadExistingReport();
    } else {
      this.generateReport();
    }
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.error.set(null);
  }
}
