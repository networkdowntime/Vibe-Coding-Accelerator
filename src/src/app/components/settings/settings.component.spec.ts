import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../services/settings.service';
import { of, throwError } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let httpTestingController: HttpTestingController;

  const mockSettings = {
    endpoint: 'https://test-endpoint.com',
    hasApiKey: true,
    isConfigured: true
  };

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'loadOpenApiSettings',
      'updateOpenApiSettings',
      'testOpenApiConnection',
      'getCurrentSettings'
    ], {
      openApiSettings$: of(mockSettings)
    });

    await TestBed.configureTestingModule({
      imports: [
        SettingsComponent,
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        { provide: SettingsService, useValue: settingsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    httpTestingController = TestBed.inject(HttpTestingController);

    settingsService.loadOpenApiSettings.and.returnValue(of(mockSettings));
    settingsService.getCurrentSettings.and.returnValue(mockSettings);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings on init', () => {
    fixture.detectChanges();
    
    expect(settingsService.loadOpenApiSettings).toHaveBeenCalled();
    expect(component.currentSettings).toEqual(mockSettings);
  });

  it('should update form data when settings change', () => {
    fixture.detectChanges();
    
    expect(component.formData.endpoint).toBe(mockSettings.endpoint);
    expect(component.formData.apiKey).toBe(''); // Should be empty for security
  });

  describe('Settings Modal', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open settings modal', () => {
      component.openSettings();
      
      expect(component.isModalOpen).toBe(true);
      expect(component.formData.endpoint).toBe(mockSettings.endpoint);
    });

    it('should close settings modal', () => {
      component.openSettings();
      component.closeSettings();
      
      expect(component.isModalOpen).toBe(false);
    });

    it('should reset form when closing modal', () => {
      component.openSettings();
      component.formData.apiKey = 'test-key';
      component.closeSettings();
      
      expect(component.formData.apiKey).toBe('');
    });
  });

  describe('Save Settings', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.openSettings();
    });

    it('should save valid settings', () => {
      component.formData = {
        endpoint: 'https://new-endpoint.com',
        apiKey: 'new-api-key'
      };

      const mockResponse = {
        message: 'Settings saved successfully',
        settings: mockSettings
      };
      settingsService.updateOpenApiSettings.and.returnValue(of(mockResponse));

      component.saveSettings();

      expect(settingsService.updateOpenApiSettings).toHaveBeenCalledWith({
        endpoint: 'https://new-endpoint.com',
        apiKey: 'new-api-key'
      });
      expect(component.isModalOpen).toBe(false);
      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('success');
    });

    it('should show error for empty endpoint', () => {
      component.formData = {
        endpoint: '',
        apiKey: 'test-key'
      };

      component.saveSettings();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('Endpoint is required');
    });

    it('should show error for empty API key', () => {
      component.formData = {
        endpoint: 'https://test-endpoint.com',
        apiKey: ''
      };

      component.saveSettings();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('API key is required');
    });

    it('should handle save errors', () => {
      component.formData = {
        endpoint: 'https://test-endpoint.com',
        apiKey: 'test-key'
      };

      const mockError = {
        error: { error: 'Invalid endpoint URL format' },
        message: 'HTTP Error'
      };
      settingsService.updateOpenApiSettings.and.returnValue(throwError(() => mockError));

      component.saveSettings();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('Invalid endpoint URL format');
    });
  });

  describe('Test Connection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should test connection successfully', () => {
      const mockResponse = {
        success: true,
        message: 'Connection successful'
      };
      settingsService.testOpenApiConnection.and.returnValue(of(mockResponse));

      component.testConnection();

      expect(settingsService.testOpenApiConnection).toHaveBeenCalled();
      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('success');
      expect(component.feedbackMessage).toBe('Connection successful');
    });

    it('should handle connection failure', () => {
      const mockResponse = {
        success: false,
        error: 'Connection failed'
      };
      settingsService.testOpenApiConnection.and.returnValue(of(mockResponse));

      component.testConnection();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('Connection failed');
    });

    it('should handle test errors', () => {
      const mockError = {
        error: { 
          error: 'Authentication failed',
          details: 'Invalid API key'
        },
        message: 'HTTP Error'
      };
      settingsService.testOpenApiConnection.and.returnValue(throwError(() => mockError));

      component.testConnection();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('Authentication failed');
      expect(component.feedbackDetails).toBe('Invalid API key');
    });

    it('should show error when not configured', () => {
      const unconfiguredSettings = {
        endpoint: '',
        hasApiKey: false,
        isConfigured: false
      };
      component.currentSettings = unconfiguredSettings;

      component.testConnection();

      expect(component.isFeedbackModalOpen).toBe(true);
      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage).toBe('Please configure OpenAPI settings first');
    });
  });

  describe('Feedback Modal', () => {
    it('should close feedback modal', () => {
      component.isFeedbackModalOpen = true;
      component.feedbackMessage = 'Test message';
      component.feedbackDetails = 'Test details';

      component.closeFeedback();

      expect(component.isFeedbackModalOpen).toBe(false);
      expect(component.feedbackMessage).toBe('');
      expect(component.feedbackDetails).toBe('');
    });
  });

  describe('Status Properties', () => {
    it('should return correct configuration status', () => {
      component.currentSettings = mockSettings;
      expect(component.isConfigured).toBe(true);

      component.currentSettings = { endpoint: '', hasApiKey: false, isConfigured: false };
      expect(component.isConfigured).toBe(false);
    });

    it('should return correct status message', () => {
      component.currentSettings = mockSettings;
      expect(component.statusMessage).toBe('OpenAPI endpoint configured');

      component.currentSettings = { endpoint: '', hasApiKey: false, isConfigured: false };
      expect(component.statusMessage).toBe('OpenAPI endpoint not configured');

      component.currentSettings = null;
      expect(component.statusMessage).toBe('Loading...');
    });
  });

  describe('Error Handling', () => {
    it('should handle service loading errors', () => {
      settingsService.loadOpenApiSettings.and.returnValue(
        throwError(() => ({ message: 'Loading failed' }))
      );
      
      spyOn(console, 'error');
      component.loadSettings();

      expect(console.error).toHaveBeenCalledWith('Error loading settings:', { message: 'Loading failed' });
      expect(component.isLoading).toBe(false);
    });
  });
});
