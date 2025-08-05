import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warn' | 'danger' | 'info';
  icon?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirmation-dialog">
      <div class="dialog-header" [class]="'header-' + (data.type || 'info')">
        <mat-icon class="dialog-icon">{{ data.icon || getDefaultIcon() }}</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="getConfirmButtonColor()"
          (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 320px;
      max-width: 500px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 24px 16px 24px;
      margin: 0;
    }

    .dialog-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .header-info .dialog-icon {
      color: #2196f3;
    }

    .header-warn .dialog-icon {
      color: #ff9800;
    }

    .header-danger .dialog-icon {
      color: #f44336;
    }

    mat-dialog-title {
      margin: 0;
      font-weight: 500;
      font-size: 1.25rem;
    }

    mat-dialog-content {
      padding: 0 24px 24px 24px;
    }

    .dialog-message {
      margin: 0;
      font-size: 1rem;
      line-height: 1.5;
      color: #666;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin-bottom: 0;
    }

    button {
      min-width: 80px;
    }

    @media (max-width: 480px) {
      .confirmation-dialog {
        min-width: 280px;
        max-width: 90vw;
      }
      
      .dialog-header {
        padding: 16px 16px 12px 16px;
      }
      
      mat-dialog-content {
        padding: 0 16px 16px 16px;
      }
      
      mat-dialog-actions {
        padding: 12px 16px;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  getDefaultIcon(): string {
    switch (this.data.type) {
      case 'warn':
        return 'warning';
      case 'danger':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  }

  getConfirmButtonColor(): string {
    switch (this.data.type) {
      case 'warn':
        return 'accent';
      case 'danger':
        return 'warn';
      case 'info':
      default:
        return 'primary';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
