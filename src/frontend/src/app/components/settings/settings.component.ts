import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { SettingsService, Settings, UpdateSettingsRequest, TestConnectionRequest } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>settings</mat-icon>
            LLM Configuration
          </mat-card-title>
          <mat-card-subtitle>
            Configure your Large Language Model endpoint and API key
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="settingsForm" (ngSubmit)="onSaveSettings()">
            <!-- LLM Endpoint -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>LLM Endpoint URL</mat-label>
              <input
                matInput
                formControlName="llmEndpoint"
                placeholder="https://api.openai.com"
                type="url"
              />
              <mat-icon matSuffix>link</mat-icon>
              @if (settingsForm.get('llmEndpoint')?.invalid && settingsForm.get('llmEndpoint')?.touched) {
                <mat-error>
                  @if (settingsForm.get('llmEndpoint')?.errors?.['required']) {
                    LLM endpoint is required
                  }
                  @if (settingsForm.get('llmEndpoint')?.errors?.['pattern']) {
                    Please enter a valid URL
                  }
                </mat-error>
              }
            </mat-form-field>

            <!-- API Key -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>API Key</mat-label>
              <input
                matInput
                formControlName="llmApiKey"
                [type]="showApiKey() ? 'text' : 'password'"
                placeholder="Enter your API key"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="toggleApiKeyVisibility()"
                [attr.aria-label]="'Show password'"
              >
                <mat-icon>{{ showApiKey() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (settingsForm.get('llmApiKey')?.invalid && settingsForm.get('llmApiKey')?.touched) {
                <mat-error>
                  API key is required
                </mat-error>
              }
            </mat-form-field>

            <!-- Action Buttons -->
            <div class="button-group">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="settingsForm.invalid || isSaving()"
                class="save-button"
              >
                @if (isSaving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                  Saving...
                } @else {
                  <ng-container>
                    <mat-icon>save</mat-icon>
                    Save Settings
                  </ng-container>
                }
              </button>

              <button
                mat-raised-button
                color="accent"
                type="button"
                (click)="onTestConnection()"
                [disabled]="settingsForm.invalid || isTesting()"
                class="test-button"
              >
                @if (isTesting()) {
                  <mat-spinner diameter="20"></mat-spinner>
                  Testing...
                } @else {
                  <ng-container>
                    <mat-icon>wifi_protected_setup</mat-icon>
                    Test Connection
                  </ng-container>
                }
              </button>
            </div>
          </form>

          <!-- Status Information -->
          @if (currentSettings()) {
            <div class="status-section">
              <h3>Current Status</h3>
              <div class="status-info">
                <div class="status-item">
                  <mat-icon [class]="currentSettings()?.isConfigured ? 'status-success' : 'status-warning'">
                    {{ currentSettings()?.isConfigured ? 'check_circle' : 'warning' }}
                  </mat-icon>
                  <span>
                    {{ currentSettings()?.isConfigured ? 'LLM is configured' : 'LLM configuration incomplete' }}
                  </span>
                </div>
                
                @if (currentSettings()?.llmEndpoint) {
                  <div class="status-item">
                    <mat-icon class="status-info">info</mat-icon>
                    <span>Endpoint: {{ currentSettings()?.llmEndpoint }}</span>
                  </div>
                }
                
                <div class="status-item">
                  <mat-icon [class]="currentSettings()?.hasApiKey ? 'status-success' : 'status-warning'">
                    {{ currentSettings()?.hasApiKey ? 'key' : 'key_off' }}
                  </mat-icon>
                  <span>
                    API Key: {{ currentSettings()?.hasApiKey ? 'Configured' : 'Not set' }}
                  </span>
                </div>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .settings-card {
      margin-bottom: 20px;
    }

    .settings-card mat-card-header {
      margin-bottom: 20px;
    }

    .settings-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .button-group {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    .save-button,
    .test-button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 140px;
    }

    .status-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .status-section h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .status-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-success {
      color: #4caf50;
    }

    .status-warning {
      color: #ff9800;
    }

    .status-info {
      color: #2196f3;
    }

    mat-spinner {
      margin-right: 8px;
    }

    @media (max-width: 600px) {
      .settings-container {
        padding: 16px;
      }

      .button-group {
        flex-direction: column;
      }

      .save-button,
      .test-button {
        width: 100%;
      }
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  private settingsService = inject(SettingsService);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  // Component state
  currentSettings = signal<Settings | null>(null);
  isSaving = signal(false);
  isTesting = signal(false);
  showApiKey = signal(false);

  // Form
  settingsForm: FormGroup;

  constructor() {
    this.settingsForm = this.formBuilder.group({
      llmEndpoint: ['', [
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/)
      ]],
      llmApiKey: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load current settings
   */
  private loadSettings(): void {
    this.settingsService.getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.currentSettings.set(settings);
          
          // Update form with current settings
          this.settingsForm.patchValue({
            llmEndpoint: settings.llmEndpoint || '',
            llmApiKey: '' // Don't populate API key for security
          });
        },
        error: (error) => {
          console.error('Failed to load settings:', error);
          this.showErrorMessage('Failed to load settings. Please try again.');
        }
      });
  }

  /**
   * Save settings
   */
  onSaveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving.set(true);
    
    const settingsData: UpdateSettingsRequest = {
      llmEndpoint: this.settingsForm.value.llmEndpoint,
      llmApiKey: this.settingsForm.value.llmApiKey
    };

    this.settingsService.updateSettings(settingsData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          this.isSaving.set(false);
          this.showSuccessMessage(message);
          
          // Clear the API key field for security
          this.settingsForm.patchValue({ llmApiKey: '' });
        },
        error: (error) => {
          this.isSaving.set(false);
          this.showErrorMessage(error.message || 'Failed to save settings');
        }
      });
  }

  /**
   * Test LLM connection
   */
  onTestConnection(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isTesting.set(true);
    
    const connectionData: TestConnectionRequest = {
      llmEndpoint: this.settingsForm.value.llmEndpoint,
      llmApiKey: this.settingsForm.value.llmApiKey
    };

    this.settingsService.testConnection(connectionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          this.isTesting.set(false);
          this.showSuccessMessage(message);
        },
        error: (error) => {
          this.isTesting.set(false);
          this.showErrorMessage(error.message || 'Connection test failed');
        }
      });
  }

  /**
   * Toggle API key visibility
   */
  toggleApiKeyVisibility(): void {
    this.showApiKey.update(value => !value);
  }

  /**
   * Mark all form controls as touched to trigger validation
   */
  private markFormGroupTouched(): void {
    Object.keys(this.settingsForm.controls).forEach(key => {
      this.settingsForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }
}
