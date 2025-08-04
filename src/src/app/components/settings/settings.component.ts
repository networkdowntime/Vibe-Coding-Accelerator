import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService, OpenApiSettings, OpenApiUpdateRequest, TestConnectionResponse } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('settingsModal', { static: false }) settingsModal!: ElementRef;
  @ViewChild('feedbackModal', { static: false }) feedbackModal!: ElementRef;

  // Form data
  formData = {
    endpoint: '',
    apiKey: ''
  };

  // Component state
  currentSettings: OpenApiSettings | null = null;
  isLoading = false;
  isTesting = false;
  isModalOpen = false;
  isFeedbackModalOpen = false;
  
  // Feedback modal data
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';
  feedbackDetails = '';

  private subscription = new Subscription();

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    // Subscribe to settings changes
    this.subscription.add(
      this.settingsService.openApiSettings$.subscribe(settings => {
        this.currentSettings = settings;
        if (settings) {
          this.formData.endpoint = settings.endpoint;
          // Don't populate API key for security
          this.formData.apiKey = '';
        }
      })
    );

    // Load current settings
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Load current settings
   */
  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.loadOpenApiSettings().subscribe({
      next: (settings) => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading settings:', error);
        this.showFeedback('Failed to load settings', 'error', error.message);
      }
    });
  }

  /**
   * Open settings modal
   */
  openSettings(): void {
    this.isModalOpen = true;
    if (this.currentSettings) {
      this.formData.endpoint = this.currentSettings.endpoint;
      this.formData.apiKey = ''; // Always start with empty API key for security
    }
  }

  /**
   * Close settings modal
   */
  closeSettings(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    if (!this.formData.endpoint.trim()) {
      this.showFeedback('Endpoint is required', 'error');
      return;
    }

    if (!this.formData.apiKey.trim()) {
      this.showFeedback('API key is required', 'error');
      return;
    }

    this.isLoading = true;

    const updateRequest: OpenApiUpdateRequest = {
      endpoint: this.formData.endpoint.trim(),
      apiKey: this.formData.apiKey.trim()
    };

    this.settingsService.updateOpenApiSettings(updateRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.closeSettings();
        this.showFeedback('Settings saved successfully', 'success');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error saving settings:', error);
        const errorMessage = error.error?.error || 'Failed to save settings';
        this.showFeedback(errorMessage, 'error', error.message);
      }
    });
  }

  /**
   * Test OpenAPI connection
   */
  testConnection(): void {
    if (!this.currentSettings?.isConfigured) {
      this.showFeedback('Please configure OpenAPI settings first', 'error');
      return;
    }

    this.isTesting = true;

    this.settingsService.testOpenApiConnection().subscribe({
      next: (response: TestConnectionResponse) => {
        this.isTesting = false;
        if (response.success) {
          this.showFeedback('Connection successful', 'success', response.message);
        } else {
          this.showFeedback('Connection failed', 'error', response.error || 'Unknown error');
        }
      },
      error: (error) => {
        this.isTesting = false;
        console.error('Error testing connection:', error);
        const errorMessage = error.error?.error || 'Failed to test connection';
        const errorDetails = error.error?.details || error.message;
        this.showFeedback(errorMessage, 'error', errorDetails);
      }
    });
  }

  /**
   * Show feedback modal
   */
  private showFeedback(message: string, type: 'success' | 'error', details?: string): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    this.feedbackDetails = details || '';
    this.isFeedbackModalOpen = true;
  }

  /**
   * Close feedback modal
   */
  closeFeedback(): void {
    this.isFeedbackModalOpen = false;
    this.feedbackMessage = '';
    this.feedbackDetails = '';
  }

  /**
   * Reset form data
   */
  private resetForm(): void {
    this.formData = {
      endpoint: this.currentSettings?.endpoint || '',
      apiKey: ''
    };
  }

  /**
   * Check if settings are configured
   */
  get isConfigured(): boolean {
    return this.currentSettings?.isConfigured || false;
  }

  /**
   * Get status message
   */
  get statusMessage(): string {
    if (!this.currentSettings) {
      return 'Loading...';
    }
    return this.currentSettings.isConfigured 
      ? 'OpenAPI endpoint configured' 
      : 'OpenAPI endpoint not configured';
  }
}
