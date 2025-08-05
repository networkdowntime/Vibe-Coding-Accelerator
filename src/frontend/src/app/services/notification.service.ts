import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom'
  };

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success message
   */
  showSuccess(message: string, action?: string): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show an error message
   */
  showError(message: string, action?: string): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 6000, // Error messages stay longer
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Show a warning message
   */
  showWarning(message: string, action?: string): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Show an info message
   */
  showInfo(message: string, action?: string): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Dismiss all snackbars
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
